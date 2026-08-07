// FILE: src/app/api/incident-types/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { incidentTypeUpdateSchema } from "@/lib/validations";

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("incident-types:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = incidentTypeUpdateSchema.parse(await req.json());

  const existing = await prisma.incidentType.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Incident type not found.");

  // Renaming a type that's already referenced on blotter cases would
  // silently orphan those cases' `incident_type` string (it's not a real
  // FK, so there's no cascade). Rename existing cases along with it so
  // "By Incident Type" reporting and filters stay accurate.
  const [incidentType] = await prisma.$transaction([
    prisma.incidentType.update({
      where: { id },
      data: {
        name: body.name,
        is_active: body.is_active,
      },
    }),
    ...(body.name && body.name !== existing.name
      ? [
          prisma.blotterCase.updateMany({
            where: { incident_type: existing.name },
            data: { incident_type: body.name },
          }),
        ]
      : []),
  ]);

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "IncidentType",
    record_id: id,
    details: `Updated incident type: ${incidentType.name}`,
  });

  return NextResponse.json(incidentType);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("incident-types:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.incidentType.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Incident type not found.");

  // incident_type is a plain string on BlotterCase, not a real FK — check
  // usage up front and give a clear, actionable message instead of
  // silently deleting a type that's still in use on filed cases.
  const caseCount = await prisma.blotterCase.count({ where: { incident_type: existing.name } });

  if (caseCount > 0) {
    throw new ApiError(
      409,
      "INCIDENT_TYPE_IN_USE",
      `Can't delete this incident type — it's still assigned to ${caseCount} blotter case${caseCount !== 1 ? "s" : ""}. Deactivate it instead, or reassign those cases first.`
    );
  }

  await prisma.incidentType.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "IncidentType",
    record_id: id,
    details: `Deleted incident type: ${existing.name}`,
  });

  return NextResponse.json({ message: "Incident type deleted successfully" });
});