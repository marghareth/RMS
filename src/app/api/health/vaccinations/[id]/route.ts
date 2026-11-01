// FILE: src/app/api/health/[id]/route.ts
//
// One health record: view, edit, delete.
//
// WHAT WAS WRONG: this route was missing. The health record detail page
// (/health/[id]), the slide-out detail panel on /health, and the edit page
// (/health/[id]/edit) all call /api/health/:id, but only the list/create
// route (/api/health) existed — so "View" showed nothing / bounced back to
// the list, and Edit and Delete always failed with 404. (The vaccinations
// equivalent, /api/health/vaccinations/[id], did exist.)
//
//   GET    /api/health/:id  — one record, with the resident (and purok) and recorder
//   PATCH  /api/health/:id  — change record_type and/or notes
//   DELETE /api/health/:id  — delete the record
//
// Each change and its audit-log entry are written in one transaction, so a
// change is never saved without its audit trail.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { healthRecordUpdateSchema } from "@/lib/validations";

const RECORD_INCLUDE = {
  resident: { include: { purok: { select: { id: true, name: true } } } },
  recorder: { select: { id: true, username: true } },
} as const;

async function recordId(context: { params: Promise<Record<string, string>> } | undefined): Promise<number> {
  const { id: idParam } = await context!.params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "INVALID_ID", "Invalid health record id.");
  return id;
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("health:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = await recordId(context);
  const record = await prisma.healthRecord.findUnique({ where: { id }, include: RECORD_INCLUDE });
  if (!record) throw new ApiError(404, "NOT_FOUND", "Health record not found.");

  return NextResponse.json(record);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("health:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = await recordId(context);
  // Moving a record to a different resident isn't something the edit page
  // offers, so only the type and notes can change here.
  const { record_type, notes } = healthRecordUpdateSchema.parse(await req.json());
  if (record_type === undefined && notes === undefined) {
    throw new ApiError(400, "NOTHING_TO_UPDATE", "Send record_type and/or notes to update.");
  }

  const existing = await prisma.healthRecord.findUnique({ where: { id }, select: { id: true, record_type: true } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Health record not found.");

  const userId = parseInt(auth.session.user.id);
  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.healthRecord.update({
      where: { id },
      data: {
        ...(record_type !== undefined ? { record_type } : {}),
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
      },
      include: RECORD_INCLUDE,
    });
    await logAudit(
      {
        user_id: userId,
        action: "UPDATE",
        table_affected: "HealthRecord",
        record_id: id,
        details:
          record_type !== undefined && record_type !== existing.record_type
            ? `Updated health record ID ${id}: type ${existing.record_type} → ${record_type}`
            : `Updated health record ID ${id}`,
      },
      tx
    );
    return updated;
  });

  return NextResponse.json(record);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("health:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = await recordId(context);
  const existing = await prisma.healthRecord.findUnique({
    where: { id },
    select: { id: true, record_type: true, resident_id: true },
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Health record not found.");

  const userId = parseInt(auth.session.user.id);
  await prisma.$transaction(async (tx) => {
    await tx.healthRecord.delete({ where: { id } });
    await logAudit(
      {
        user_id: userId,
        action: "DELETE",
        table_affected: "HealthRecord",
        record_id: id,
        details: `Deleted ${existing.record_type} health record ID ${id} (resident ID ${existing.resident_id})`,
      },
      tx
    );
  });

  return NextResponse.json({ message: "Health record deleted successfully" });
});