import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("blotter:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const blotter_case_id = parseInt(params.id);

  const update = await prisma.blotterUpdate.create({
    data: {
      blotter_case_id,
      updated_by: parseInt(auth.session.user.id),
      notes: body.notes,
      new_status: body.new_status || null,
    },
  });

  // update case status if provided
  if (body.new_status) {
    await prisma.blotterCase.update({
      where: { id: blotter_case_id },
      data: { status: body.new_status },
    });
  }

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "BlotterUpdate",
    record_id: update.id,
    details: `Added update to blotter case ID: ${blotter_case_id}`,
  });

  return NextResponse.json(update, { status: 201 });
}