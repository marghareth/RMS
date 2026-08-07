// FILE: src/app/api/deceased-records/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { deceasedRecordUpdateSchema } from "@/lib/validations";

const residentSelect = {
  id: true,
  fname: true,
  lname: true,
  mname: true,
  name_extension: true,
  type_of_resident: true,
} as const;

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("deceased:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const record = await prisma.deceasedRecord.findUnique({
    where: { id: parseInt(idParam) },
    include: { resident: { select: residentSelect } },
  });

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(record);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("deceased:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  // resident_id is intentionally omitted from this schema — a deceased
  // record can't be re-pointed at a different resident after creation.
  const body = deceasedRecordUpdateSchema.parse(await req.json());

  const record = await prisma.deceasedRecord.update({
    where: { id },
    data: {
      date_of_death:    body.date_of_death,
      immediate_cause:  body.immediate_cause,
      underlying_cause: "underlying_cause" in body ? body.underlying_cause ?? null : undefined,
    },
    include: { resident: { select: residentSelect } },
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "UPDATE",
    table_affected: "DeceasedRecord",
    record_id:      id,
    details:        `Updated deceased record for: ${record.resident.fname} ${record.resident.lname}`,
  });

  return NextResponse.json(record);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("deceased:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.deceasedRecord.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Undo the create-time side effect: clearing the record should also clear
  // the resident's `is_deceased` flag so the two never drift out of sync.
  const record = await prisma.$transaction(async (tx) => {
    const deleted = await tx.deceasedRecord.delete({
      where: { id },
      include: { resident: { select: residentSelect } },
    });
    await tx.resident.update({
      where: { id: existing.resident_id },
      data: { is_deceased: false },
    });
    return deleted;
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "DELETE",
    table_affected: "DeceasedRecord",
    record_id:      id,
    details:        `Deleted deceased record for: ${record.resident.fname} ${record.resident.lname}`,
  });

  return NextResponse.json({ message: "Deceased record deleted" });
});