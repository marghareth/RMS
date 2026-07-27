// FILE: src/app/api/blotter/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { blotterUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("blotter:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const blotterCase = await prisma.blotterCase.findUnique({
    where: { id: parseInt(idParam) },
    include: {
      updates: {
        include: { updater: { select: { id: true, username: true } } },
        orderBy: { updated_at: "desc" },
      },
      complainant: true,
      respondent: true,
    },
  });

  if (!blotterCase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(blotterCase);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("blotter:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = blotterUpdateSchema.parse(await req.json());

  const blotterCase = await prisma.blotterCase.update({
    where: { id },
    data: {
      status: body.status,
      hearing_date: "hearing_date" in body ? body.hearing_date ?? null : undefined,
      escalated: body.escalated,
      incident_narrative: body.incident_narrative,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "BlotterCase",
    record_id: id,
    details: `Updated blotter case: ${blotterCase.case_number}`,
  });

  return NextResponse.json(blotterCase);
});