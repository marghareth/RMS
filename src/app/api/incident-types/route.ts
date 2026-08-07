// FILE: src/app/api/incident-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { incidentTypeCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("incident-types:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const incidentTypes = await prisma.incidentType.findMany({
    orderBy: { name: "asc" },
  });

  // Attach a usage count per type so the admin UI can show "N cases" and
  // decide whether a delete would be blocked, without a second round trip.
  const counts = await prisma.blotterCase.groupBy({
    by: ["incident_type"],
    _count: true,
  });
  const countByName = new Map(counts.map((c) => [c.incident_type, c._count]));

  const result = incidentTypes.map((t) => ({
    ...t,
    _count: { blotter_cases: countByName.get(t.name) ?? 0 },
  }));

  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("incident-types:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = incidentTypeCreateSchema.parse(await req.json());
  const incidentType = await prisma.incidentType.create({ data: { name: body.name } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "IncidentType",
    record_id: incidentType.id,
    details: `Added incident type: ${incidentType.name}`,
  });

  return NextResponse.json(incidentType, { status: 201 });
});