// FILE: src/lib/backup.ts
//
// Database backups, with two places a backup can go:
//
//   "supabase" (use this on Vercel)
//     Reads every table through Prisma (src/lib/backup-snapshot.ts), gzips
//     it as JSON and uploads it to a PRIVATE Supabase Storage bucket
//     (src/lib/supabase-storage.ts). Needs no pg_dump and no disk, so it
//     works on serverless hosting. Restore with:
//       npm run db:restore -- <downloaded-file>.json.gz
//
//   "local" (self-hosted server / VM / Docker only)
//     The original behavior: runs `pg_dump` and writes a plain .sql file to
//     BACKUP_DIR (default ./backups). Restore with `psql`.
//
// FIX: before this change only "local" existed. On Vercel there is no
// pg_dump binary and the filesystem is wiped after each request, so the
// Backup button always failed (or, at best, wrote a file that vanished).
//
// Which one runs:
//   BACKUP_STORAGE=supabase|local  — explicit choice, or
//   unset → "supabase" when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
//           set, otherwise "local".
// On Vercel, "local" is refused with a clear message instead of failing in
// a confusing way.
//
// Backup.file_reference tells the download route where a file lives:
//   "supabase:<bucket>/<path>"  → Supabase Storage
//   anything else               → a file name inside BACKUP_DIR (older rows)

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { BackupError, encodeSnapshot, exportSnapshot, totalRows, type ModelMeta, type SnapshotClient } from "./backup-snapshot";
import { downloadObject, getSupabaseStorageConfig, SupabaseStorageError, uploadObject } from "./supabase-storage";

export { BackupError } from "./backup-snapshot";

const execFileAsync = promisify(execFile);

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(process.cwd(), "backups");

const SUPABASE_PREFIX = "supabase:";

export type BackupDestination = "supabase" | "local";

/** The backup row exists but its file can't be found. */
export class BackupFileMissingError extends BackupError {}

export interface BackupResult {
  /** What's stored in Backup.file_reference (see the header comment for the format). */
  fileReference: string;
  sizeBytes: number;
  destination: BackupDestination;
  /** Number of rows saved — only known for snapshot backups. */
  rowCount?: number;
}

/** Decides where a new backup goes, from the environment. */
export function resolveBackupDestination(env: Record<string, string | undefined> = process.env): BackupDestination {
  const explicit = env.BACKUP_STORAGE?.trim().toLowerCase();
  if (explicit === "supabase" || explicit === "local") return explicit;
  if (explicit) throw new BackupError(`BACKUP_STORAGE must be "supabase" or "local", not "${env.BACKUP_STORAGE}".`);
  return getSupabaseStorageConfig(env) ? "supabase" : "local";
}

export type ParsedFileReference =
  | { kind: "supabase"; bucket: string; objectPath: string; filename: string }
  | { kind: "local"; relativePath: string; filename: string };

/** Splits a stored Backup.file_reference into where the file lives. */
export function parseFileReference(ref: string): ParsedFileReference {
  if (ref.startsWith(SUPABASE_PREFIX)) {
    const rest = ref.slice(SUPABASE_PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash <= 0 || slash === rest.length - 1) throw new BackupError("Invalid backup reference.");
    const objectPath = rest.slice(slash + 1);
    if (objectPath.split("/").some((seg) => seg === ".." || seg === "")) throw new BackupError("Invalid backup reference.");
    return { kind: "supabase", bucket: rest.slice(0, slash), objectPath, filename: path.posix.basename(objectPath) };
  }
  return { kind: "local", relativePath: ref, filename: path.basename(ref) };
}

function timestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

/** Model list from the generated Prisma client (loaded lazily so tests don't need it). */
async function loadModels(): Promise<readonly ModelMeta[]> {
  const { Prisma } = await import("@prisma/client");
  return Prisma.dmmf.datamodel.models as unknown as readonly ModelMeta[];
}

/** Snapshot backup → Supabase Storage. */
async function runSupabaseBackup(): Promise<BackupResult> {
  const cfg = getSupabaseStorageConfig();
  if (!cfg) {
    throw new BackupError(
      "Supabase Storage isn't configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and create a private \"backups\" bucket)."
    );
  }

  const { prisma } = await import("./db");
  const models = await loadModels();

  // One REPEATABLE READ transaction = every table read at the same instant,
  // so a resident added halfway through can't leave the backup inconsistent.
  const snapshot = await prisma.$transaction(
    (tx) => exportSnapshot(tx as unknown as SnapshotClient, models),
    { isolationLevel: "RepeatableRead", timeout: 50_000, maxWait: 10_000 }
  );

  const body = encodeSnapshot(snapshot);
  const date = new Date();
  const objectPath = `${date.getUTCFullYear()}/backup-${timestampForFilename(date)}.json.gz`;

  try {
    await uploadObject(cfg, objectPath, body, "application/gzip");
  } catch (err) {
    if (err instanceof SupabaseStorageError) throw new BackupError(err.message);
    throw err;
  }

  return {
    fileReference: `${SUPABASE_PREFIX}${cfg.bucket}/${objectPath}`,
    sizeBytes: body.length,
    destination: "supabase",
    rowCount: totalRows(snapshot),
  };
}

/** pg_dump backup → local disk (self-hosted only). */
async function runLocalBackup(): Promise<BackupResult> {
  if (process.env.VERCEL) {
    throw new BackupError(
      "Local backups can't run on Vercel (no pg_dump, and files are deleted after each request). " +
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to store backups in Supabase Storage instead."
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new BackupError("DATABASE_URL is not set — cannot run a backup.");
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const filename = `backup-${timestampForFilename()}.sql`;
  const finalPath = path.join(BACKUP_DIR, filename);
  // Write to a .tmp path first and rename on success, so a crashed/killed
  // dump never leaves a partial file that looks like a valid backup.
  const tmpPath = `${finalPath}.tmp`;

  try {
    // Plain-SQL format (-F p): restorable with nothing but `psql`.
    await execFileAsync("pg_dump", [databaseUrl, "-F", "p", "-f", tmpPath], {
      timeout: 5 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 64,
    });
  } catch (err) {
    await fs.rm(tmpPath, { force: true });
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      throw new BackupError(
        "pg_dump isn't installed on this server. Install the PostgreSQL client tools, or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use Supabase Storage."
      );
    }
    throw new BackupError(`pg_dump failed: ${message.slice(0, 500)}`);
  }

  await fs.rename(tmpPath, finalPath);
  const stat = await fs.stat(finalPath);

  return { fileReference: filename, sizeBytes: stat.size, destination: "local" };
}

/** Runs a backup to whichever destination is configured. Throws BackupError on any failure. */
export async function runDatabaseBackup(): Promise<BackupResult> {
  return resolveBackupDestination() === "supabase" ? runSupabaseBackup() : runLocalBackup();
}

export interface BackupFile {
  body: Buffer;
  filename: string;
  contentType: string;
}

/** Fetches a stored backup for download, from Supabase Storage or local disk. */
export async function readBackupFile(fileReference: string): Promise<BackupFile> {
  const ref = parseFileReference(fileReference);

  if (ref.kind === "supabase") {
    const cfg = getSupabaseStorageConfig();
    if (!cfg) {
      throw new BackupError("This backup is in Supabase Storage, but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set on this server.");
    }
    try {
      const body = await downloadObject(cfg, ref.objectPath, fetch, ref.bucket);
      return { body, filename: ref.filename, contentType: "application/gzip" };
    } catch (err) {
      if (err instanceof SupabaseStorageError) {
        if (err.status === 404 || /not found/i.test(err.message)) {
          throw new BackupFileMissingError("This backup's file is no longer in Supabase Storage (it may have been deleted).");
        }
        throw new BackupError(err.message);
      }
      throw err;
    }
  }

  const absolutePath = resolveBackupPath(ref.relativePath);
  try {
    return { body: await fs.readFile(absolutePath), filename: ref.filename, contentType: "application/sql" };
  } catch {
    throw new BackupFileMissingError(
      "This backup's file is no longer on disk (it may have been moved, deleted, or this is a different server than the one that created it)."
    );
  }
}

/** Resolves a stored relative path back to an absolute path, guarding against path traversal. */
export function resolveBackupPath(relativePath: string): string {
  const resolved = path.resolve(BACKUP_DIR, relativePath);
  if (!resolved.startsWith(BACKUP_DIR + path.sep)) {
    throw new BackupError("Invalid backup path.");
  }
  return resolved;
}