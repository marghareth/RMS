// FILE: src/app/api/blotter/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { blotterUpdateSchema } from "@/lib/validations";
import { blotterProblems } from "@/lib/form-rules";
import { throwIfProblems, withChanges } from "@/lib/validation-error";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("blotter:read", req);
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
  const auth = await requirePermission("blotter:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = blotterUpdateSchema.parse(await req.json());

  const current = await prisma.blotterCase.findUnique({
    where: { id },
    select: { incident_date: true, hearing_date: true, complainant_id: true, respondent_id: true },
  });
  // Only the hearing date is checked against the existing incident date;
  // an old incident date isn't re-judged on every edit.
  if (current) {
    const merged = withChanges(current, body);
    throwIfProblems(blotterProblems({ ...merged, incident_date: undefined }).concat(
      blotterProblems(merged).filter((p) => p.field === "hearing_date")
    ));
  }

  const blotterCase = await prisma.blotterCase.update({
    where: { id },
    data: {
      status: body.status,
      hearing_date: "hearing_date" in body ? body.hearing_date ?? null : undefined,
      escalated: body.escalated,
      incident_narrative: body.incident_narrative,
      incident_type: body.incident_type,
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