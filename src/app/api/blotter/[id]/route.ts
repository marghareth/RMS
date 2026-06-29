import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("blotter:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const blotterCase = await prisma.blotterCase.findUnique({
    where: { id: parseInt(params.id) },
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
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("blotter:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const blotterCase = await prisma.blotterCase.update({
    where: { id },
    data: {
      status: body.status,
      hearing_date: body.hearing_date ? new Date(body.hearing_date) : undefined,
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
}