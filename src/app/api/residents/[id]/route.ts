// FILE: src/app/api/residents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { residentUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const resident = await prisma.resident.findUnique({
    where: { id },
    include: {
      purok: true,
      household: {
        include: {
          members: { where: { is_archived: false }, orderBy: { lname: "asc" } },
        },
      },
      certificates: { orderBy: { requested_at: "desc" } },
      special_registries: true,
      health_records: { orderBy: { recorded_at: "desc" } },
      vaccinations: { orderBy: { date_given: "desc" } },
      barangay_ids: true,
      official: true,

      // ── Resident Profile Enhancements (2.9) ──
      deceased_record: true,
      sectors: { orderBy: { created_at: "asc" } },
      government_assistance: { orderBy: { date_enrolled: "desc" } },
      blotter_as_complainant: { orderBy: { incident_date: "desc" } },
      blotter_as_respondent: { orderBy: { incident_date: "desc" } },
    },
  });

  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Activity History (2.9) ──
  // Pulled from AuditLog rather than a dedicated table: any log row whose
  // table_affected/record_id points at this resident, their household, or
  // one of their certificates counts as "this resident's activity".
  const certificateIds = resident.certificates.map((c) => c.id);
  const orConditions: any[] = [{ table_affected: "Resident", record_id: id }];
  if (resident.household_id) {
    orConditions.push({ table_affected: "Household", record_id: resident.household_id });
  }
  if (certificateIds.length > 0) {
    orConditions.push({ table_affected: "Certificate", record_id: { in: certificateIds } });
  }
  if (resident.deceased_record) {
    orConditions.push({ table_affected: "DeceasedRecord", record_id: resident.deceased_record.id });
  }

  const activity_history = await prisma.auditLog.findMany({
    where: { OR: orConditions },
    include: { user: { select: { username: true } } },
    orderBy: { performed_at: "desc" },
    take: 50,
  });

  return NextResponse.json({ ...resident, activity_history });
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  // .partial() means an omitted field parses to `undefined`, and Prisma's
  // `update` silently skips undefined fields — so a PATCH sending only
  // `{ household_id }` can no longer wipe out purok_id, sector, etc. the
  // way the old `body.x ?? null` pattern did. This also means every new
  // 2.9 field (email, mobile, granular address, identity, voter info)
  // flows through automatically since residentUpdateSchema already covers
  // them field-for-field — no extra mapping needed here.
  const body = residentUpdateSchema.parse(await req.json());

  if (Object.keys(body).length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "No fields to update.");
  }

  const resident = await prisma.resident.update({ where: { id }, data: body });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Resident",
    record_id: id,
    details: `Updated resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json(resident);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  // Soft delete only — never hard delete residents
  const resident = await prisma.resident.update({
    where: { id },
    data: { is_archived: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "ARCHIVE",
    table_affected: "Resident",
    record_id: id,
    details: `Archived resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json({ message: "Resident archived successfully" });
});