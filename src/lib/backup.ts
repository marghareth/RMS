// FILE: src/lib/backup.ts
//
// Runs a real `pg_dump` against DATABASE_URL and writes the result to disk.
// This replaces the previous behavior of the Backup feature, which only
// created a database row referencing a file that was never actually
// written — clicking "Backup" looked like it worked but produced nothing
// you could restore from in an emergency.
//
// DEPLOYMENT NOTE: this writes to a local directory (BACKUP_DIR, default
// "./backups") and therefore requires a persistent filesystem — a
// self-hosted server, VM, or Docker volume. It will NOT work as-is on
// serverless platforms with ephemeral/read-only filesystems (e.g. Vercel
// functions outside /tmp), since the dump would vanish after the request.
// If you deploy there, point BACKUP_DIR at a mounted volume, or swap the
// final `fs.rename` below for an upload to S3/GCS/etc.
//
// Requires the `pg_dump` binary to be present on the host (it ships with
// any standard PostgreSQL client tools install / the `postgresql-client`
// package on Debian/Ubuntu).

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(process.cwd(), "backups");

export class BackupError extends Error {}

export interface BackupResult {
  /** Path relative to BACKUP_DIR — this is what's stored in Backup.file_reference. */
  relativePath: string;
  sizeBytes: number;
}

/** Runs pg_dump and writes a timestamped .sql file. Throws BackupError on any failure. */
export async function runDatabaseBackup(): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new BackupError("DATABASE_URL is not set — cannot run a backup.");
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql`;
  const finalPath = path.join(BACKUP_DIR, filename);
  // Write to a .tmp path first and rename on success, so a crashed/killed
  // dump never leaves a partial file that looks like a valid backup.
  const tmpPath = `${finalPath}.tmp`;

  try {
    // Plain-SQL format (-F p) rather than custom/compressed format: it's
    // restorable with nothing but `psql`, which matters for barangay IT
    // staff who may not have pg_restore on hand during an actual incident.
    await execFileAsync("pg_dump", [databaseUrl, "-F", "p", "-f", tmpPath], {
      // Dumps can legitimately take a while on a large resident database.
      timeout: 5 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 64,
    });
  } catch (err) {
    await fs.rm(tmpPath, { force: true });
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT")) {
      throw new BackupError(
        "pg_dump isn't installed on this server. Install the PostgreSQL client tools to enable backups."
      );
    }
    throw new BackupError(`pg_dump failed: ${message.slice(0, 500)}`);
  }

  await fs.rename(tmpPath, finalPath);
  const stat = await fs.stat(finalPath);

  return { relativePath: filename, sizeBytes: stat.size };
}

/** Resolves a stored relative path back to an absolute path, guarding against path traversal. */
export function resolveBackupPath(relativePath: string): string {
  const resolved = path.resolve(BACKUP_DIR, relativePath);
  if (!resolved.startsWith(BACKUP_DIR + path.sep)) {
    throw new BackupError("Invalid backup path.");
  }
  return resolved;
}