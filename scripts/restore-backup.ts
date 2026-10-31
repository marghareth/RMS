// FILE: scripts/restore-backup.ts
//
// Loads an RMS snapshot backup (the .json.gz files made by the Backup page
// when backups go to Supabase Storage) into an EMPTY database.
//
// Steps:
//   1. Make a new, empty database (e.g. a fresh Supabase project, or a local
//      Postgres) and point DATABASE_URL at it.
//   2. Create the tables:            npx prisma migrate deploy
//   3. Load the backup:              npm run db:restore -- path/to/backup-….json.gz
//
// The script refuses to write into a database that already has rows in any
// table, so it can't mix a backup into live data by accident. Everything is
// written in one transaction: if anything fails, nothing is kept.
//
// (Backups made on a self-hosted server with BACKUP_STORAGE=local are plain
// .sql files from pg_dump — restore those with `psql "$DATABASE_URL" -f file.sql`.)

import fs from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { decodeSnapshot, delegateName, planRestore, type ModelMeta } from "../src/lib/backup-snapshot";

const prisma = new PrismaClient();
const CHUNK = 500;

type Delegate = {
  count: () => Promise<number>;
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
  update: (args: { where: { id: unknown }; data: Record<string, unknown> }) => Promise<unknown>;
};

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run db:restore -- <backup-file.json.gz>");
    process.exit(2);
  }

  const snapshot = decodeSnapshot(await fs.readFile(file));
  const models = Prisma.dmmf.datamodel.models as unknown as readonly ModelMeta[];
  const modelNames = new Set(models.map((m) => m.name));

  const unknownModels = Object.keys(snapshot.models).filter((n) => !modelNames.has(n));
  if (unknownModels.length > 0) {
    throw new Error(
      `The backup has tables this app version doesn't know: ${unknownModels.join(", ")}. Restore with the app version that made the backup.`
    );
  }

  const client = prisma as unknown as Record<string, Delegate>;

  // Refuse to restore over existing data.
  const nonEmpty: string[] = [];
  for (const m of models) {
    if ((await client[delegateName(m.name)].count()) > 0) nonEmpty.push(m.name);
  }
  if (nonEmpty.length > 0) {
    throw new Error(
      `The target database is not empty (rows found in: ${nonEmpty.join(", ")}). Restore into a fresh database after running "npx prisma migrate deploy".`
    );
  }

  const plan = planRestore(models);
  const tableOf = new Map(models.map((m) => [m.name, m.dbName ?? m.name]));
  console.log(`\nRestoring backup from ${snapshot.created_at} …\n`);

  await prisma.$transaction(
    async (tx) => {
      const txc = tx as unknown as Record<string, Delegate>;

      // Pass 1: insert rows in dependency order, leaving "forward" optional
      // foreign keys empty for now.
      for (const name of plan.order) {
        const rows = snapshot.models[name] ?? [];
        const deferred = plan.deferred[name] ?? [];
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK).map((row) => {
            if (deferred.length === 0) return row;
            const copy = { ...row };
            for (const col of deferred) copy[col] = null;
            return copy;
          });
          await txc[delegateName(name)].createMany({ data: chunk });
        }
        console.log(`  ${name.padEnd(22)} ${rows.length}`);
      }

      // Pass 2: fill in the foreign keys left empty above
      // (e.g. Household.household_head_id).
      for (const [name, cols] of Object.entries(plan.deferred)) {
        for (const row of snapshot.models[name] ?? []) {
          const data: Record<string, unknown> = {};
          for (const col of cols) if (row[col] !== null && row[col] !== undefined) data[col] = row[col];
          if (Object.keys(data).length > 0) await txc[delegateName(name)].update({ where: { id: row.id }, data });
        }
      }

      // Pass 3: move each id sequence past the restored ids, so the next
      // record created in the app doesn't collide with a restored one.
      for (const m of models) {
        const table = `"${tableOf.get(m.name)!.replace(/"/g, '""')}"`;
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table.replace(/'/g, "''")}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), (SELECT MAX(id) FROM ${table}) IS NOT NULL)`
        );
      }
    },
    { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 }
  );

  const total = Object.values(snapshot.counts).reduce((a, b) => a + b, 0);
  console.log(`\n✅ Restore complete: ${total} rows.`);
  console.log("   Users keep their old passwords and 2FA settings from the backup.");
}

main()
  .catch((e) => {
    console.error("\n❌ Restore failed — nothing was written:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());