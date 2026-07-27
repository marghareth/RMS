// FILE: src/app/api/blotter/[id]/updates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { blotterUpdateEntrySchema } from "@/lib/validations";

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("blotter:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const blotter_case_id = parseInt(idParam);
  const body = blotterUpdateEntrySchema.parse(await req.json());

  const update = await prisma.blotterUpdate.create({
    data: {
      blotter_case_id,
      updated_by: parseInt(auth.session.user.id),
      notes: body.notes,
      new_status: body.new_status ?? null,
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
});