// FILE: src/lib/audit.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type AuditEntry = {
  user_id: number;
  action: string;
  table_affected: string;
  record_id?: number;
  details?: string;
};

/** Anything that can create an AuditLog row: the shared client or a transaction client. */
type AuditDb = Pick<Prisma.TransactionClient, "auditLog">;

function toData(entry: AuditEntry) {
  return {
    user_id: entry.user_id,
    action: entry.action,
    table_affected: entry.table_affected,
    record_id: entry.record_id,
    details: entry.details,
  };
}

/**
 * Writes one audit row.
 *
 * ATOMICITY: called bare (`await logAudit(...)` after a write) the audit
 * row is a *separate* statement, so a failure here leaves a committed
 * change with no audit trail — and a 500 for a request that actually
 * succeeded. For anything that changes money, people's access, or legal
 * documents, write the audit row in the same transaction as the change:
 *
 *   await prisma.$transaction(async (tx) => {
 *     const row = await tx.thing.update(...);
 *     await logAudit({ ... record_id: row.id }, tx);   // <- pass `tx`
 *     return row;
 *   });
 *
 * or, when the record id is already known, use `auditOp` inside an
 * array-style `prisma.$transaction([...])`.
 */
export async function logAudit(entry: AuditEntry, db: AuditDb = prisma) {
  await db.auditLog.create({ data: toData(entry) });
}

/**
 * Lazy audit write for array-style `prisma.$transaction([...])`. Returns the
 * un-awaited Prisma promise so it executes inside the batch and commits or
 * rolls back with the rest of it. Only usable when `record_id` is known up
 * front (updates/deletes); for creates use the interactive form above.
 */
export function auditOp(entry: AuditEntry) {
  return prisma.auditLog.create({ data: toData(entry) });
}