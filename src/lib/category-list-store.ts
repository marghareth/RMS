// FILE: src/lib/category-list-store.ts
//
// Server-side reading and saving of the editable pick-lists described in
// src/lib/category-lists.ts. Used by /api/financial-categories and
// /api/appropriation-subcategories.
import { prisma } from "./db";
import { logAudit } from "./audit";
import { parseStoredList } from "./category-lists";

/** Every list in `keys`, by name, using `defaults` for any not saved yet. */
export async function readLists<K extends string>(
  keys: Record<K, string>,
  defaults: Record<K, string[]>
): Promise<Record<K, string[]>> {
  const names = Object.keys(keys) as K[];
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: names.map((n) => keys[n]) } },
  });
  const byKey = new Map(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
  return Object.fromEntries(names.map((n) => [n, parseStoredList(byKey.get(keys[n]), defaults[n])])) as Record<K, string[]>;
}

/** Saves one list and its audit entry together. */
export async function saveList(opts: {
  key: string;
  list: string[];
  userId: number;
  details: string;
}): Promise<void> {
  const value = JSON.stringify(opts.list);
  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key: opts.key },
      update: { value },
      create: { key: opts.key, value },
    });
    await logAudit(
      { user_id: opts.userId, action: "UPDATE", table_affected: "SystemSetting", details: opts.details },
      tx
    );
  });
}