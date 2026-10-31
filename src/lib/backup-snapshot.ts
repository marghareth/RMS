// FILE: src/lib/backup-snapshot.ts
//
// Database snapshot that works without pg_dump.
//
// WHY: the Backup button ran `pg_dump` and wrote the file to the server's
// disk. On Vercel neither exists — there is no pg_dump binary, and the disk
// is thrown away after each request — so the button could never produce a
// usable backup there. This module reads every table through Prisma (which
// the app already has) and turns the rows into one gzipped JSON file that can
// be stored anywhere (see src/lib/supabase-storage.ts) and loaded back with
// scripts/restore-backup.ts.
//
// FORMAT (version 1), gzipped JSON:
//   {
//     "format": "brgy-rms-snapshot", "version": 1,
//     "created_at": "2026-10-31T08:00:00.000Z",
//     "counts": { "User": 6, "Resident": 1200, … },
//     "models": { "User": [ {…row…}, … ], "Resident": [ … ], … }
//   }
// Dates are ISO strings and Decimals are strings (Prisma's own JSON form);
// Prisma accepts both when the rows are written back.
//
// SENSITIVE: a snapshot is the whole database — resident records, password
// hashes, 2FA secrets. Keep the storage bucket PRIVATE.
//
// The model list comes from Prisma's generated metadata at runtime
// (`Prisma.dmmf`), so a model added later is backed up automatically. The
// functions here take that list as a parameter, which keeps them testable
// without a database.

import { gzipSync, gunzipSync } from "node:zlib";

export class BackupError extends Error {}

export const SNAPSHOT_FORMAT = "brgy-rms-snapshot";
export const SNAPSHOT_VERSION = 1;

/** The slice of Prisma's DMMF field metadata this module needs. */
export interface FieldMeta {
  name: string;
  kind: string; // "scalar" | "object" | "enum" | "unsupported"
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId?: boolean;
  relationFromFields?: readonly string[];
}

/** The slice of Prisma's DMMF model metadata this module needs. */
export interface ModelMeta {
  name: string;
  dbName?: string | null;
  fields: readonly FieldMeta[];
}

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
  created_at: string;
  counts: Record<string, number>;
  models: Record<string, Record<string, unknown>[]>;
}

/** Anything with Prisma-style model delegates (`client.user.findMany`, …). */
export type SnapshotClient = Record<string, unknown>;

type FindManyDelegate = {
  findMany: (args: {
    take: number;
    orderBy: Record<string, "asc">;
    skip?: number;
    cursor?: Record<string, unknown>;
  }) => Promise<Record<string, unknown>[]>;
};

/** "BrgyOfficial" → "brgyOfficial", the property name Prisma uses on the client. */
export function delegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function idFieldOf(model: ModelMeta): string {
  const id = model.fields.find((f) => f.isId);
  if (!id) throw new BackupError(`Model ${model.name} has no single @id field; it can't be paged for backup.`);
  return id.name;
}

/**
 * Reads every row of every model, a page at a time (ordered by id, so a big
 * table never has to fit in one query). Pass a transaction client opened with
 * REPEATABLE READ isolation to get one consistent point-in-time view across
 * all tables.
 */
export async function exportSnapshot(
  client: SnapshotClient,
  models: readonly ModelMeta[],
  pageSize = 1000
): Promise<Snapshot> {
  const snapshot: Snapshot = {
    format: SNAPSHOT_FORMAT,
    version: SNAPSHOT_VERSION,
    created_at: new Date().toISOString(),
    counts: {},
    models: {},
  };

  for (const model of models) {
    const delegate = client[delegateName(model.name)] as FindManyDelegate | undefined;
    if (!delegate || typeof delegate.findMany !== "function") {
      throw new BackupError(`The database client has no "${delegateName(model.name)}" model; is the Prisma client out of date?`);
    }
    const idField = idFieldOf(model);
    const rows: Record<string, unknown>[] = [];
    let cursor: unknown = undefined;

    for (;;) {
      const page: Record<string, unknown>[] = await delegate.findMany({
        take: pageSize,
        orderBy: { [idField]: "asc" },
        ...(cursor === undefined ? {} : { skip: 1, cursor: { [idField]: cursor } }),
      });
      rows.push(...page);
      if (page.length < pageSize) break;
      cursor = page[page.length - 1][idField];
    }

    snapshot.models[model.name] = rows;
    snapshot.counts[model.name] = rows.length;
  }

  return snapshot;
}

/** Snapshot → gzipped JSON bytes. */
export function encodeSnapshot(snapshot: Snapshot): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(snapshot), "utf8"));
}

/** Gzipped JSON bytes → Snapshot, with a format check so a wrong file fails clearly. */
export function decodeSnapshot(bytes: Buffer | Uint8Array): Snapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(gunzipSync(bytes).toString("utf8"));
  } catch {
    throw new BackupError("This file isn't a readable RMS backup (expected gzipped JSON).");
  }
  const s = parsed as Partial<Snapshot>;
  if (s?.format !== SNAPSHOT_FORMAT) throw new BackupError("This file isn't an RMS backup snapshot.");
  if (s.version !== SNAPSHOT_VERSION) {
    throw new BackupError(`Unsupported backup version ${String(s.version)} (this app reads version ${SNAPSHOT_VERSION}).`);
  }
  if (!s.models || typeof s.models !== "object") throw new BackupError("Backup snapshot has no table data.");
  return s as Snapshot;
}

/** Total number of rows in a snapshot. */
export function totalRows(snapshot: Snapshot): number {
  return Object.values(snapshot.counts).reduce((a, b) => a + b, 0);
}

export interface RestorePlan {
  /** Model names in an order where every required foreign key points at an earlier model. */
  order: string[];
  /**
   * Optional foreign-key columns that must be written in a second pass,
   * because the row they point to is inserted later (or in the same table).
   * In this schema that's Household.household_head_id → Resident, since
   * Resident.household_id also points back at Household.
   */
  deferred: Record<string, string[]>;
}

/**
 * Works out a safe insert order for restoring a snapshot. Required foreign
 * keys decide the order; optional ones that would point "forward" are
 * inserted as NULL and filled in afterwards.
 */
export function planRestore(models: readonly ModelMeta[]): RestorePlan {
  const names = models.map((m) => m.name);
  const known = new Set(names);

  // dependsOn[A] = models A has a REQUIRED foreign key to.
  const dependsOn = new Map<string, Set<string>>();
  for (const m of models) {
    const deps = new Set<string>();
    for (const f of m.fields) {
      if (f.kind === "object" && f.isRequired && (f.relationFromFields?.length ?? 0) > 0 && f.type !== m.name && known.has(f.type)) {
        deps.add(f.type);
      }
    }
    dependsOn.set(m.name, deps);
  }

  // Kahn's algorithm, always taking the earliest-declared ready model so the
  // order is stable and follows schema.prisma where possible.
  const order: string[] = [];
  const placed = new Set<string>();
  while (order.length < names.length) {
    const next = names.find((n) => !placed.has(n) && [...dependsOn.get(n)!].every((d) => placed.has(d)));
    if (!next) {
      const stuck = names.filter((n) => !placed.has(n));
      throw new BackupError(`Required foreign keys form a cycle between: ${stuck.join(", ")}. Can't plan a restore order.`);
    }
    order.push(next);
    placed.add(next);
  }

  const position = new Map(order.map((n, i) => [n, i]));
  const deferred: Record<string, string[]> = {};
  for (const m of models) {
    for (const f of m.fields) {
      if (f.kind !== "object" || f.isRequired || !f.relationFromFields?.length || !known.has(f.type)) continue;
      if (position.get(f.type)! >= position.get(m.name)!) {
        (deferred[m.name] ??= []).push(...f.relationFromFields);
      }
    }
  }

  return { order, deferred };
}