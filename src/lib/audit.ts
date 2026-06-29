import { prisma } from "./db";

export async function logAudit({
  user_id,
  action,
  table_affected,
  record_id,
  details,
}: {
  user_id: number;
  action: string;
  table_affected: string;
  record_id?: number;
  details?: string;
}) {
  await prisma.auditLog.create({
    data: {
      user_id,
      action,
      table_affected,
      record_id,
      details,
    },
  });
}