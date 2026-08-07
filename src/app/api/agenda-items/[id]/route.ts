// FILE: src/app/api/agenda-items/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { agendaItemUpdateSchema } from "@/lib/validations";

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("meetings:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = agendaItemUpdateSchema.parse(await req.json());

  const existing = await prisma.agendaItem.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Agenda item not found.");

  const agendaItem = await prisma.agendaItem.update({
    where: { id },
    data: {
      title: body.title,
      description: "description" in body ? body.description ?? null : undefined,
      sort_order: body.sort_order,
      status: body.status,
      minutes: "minutes" in body ? body.minutes ?? null : undefined,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "AgendaItem",
    record_id: id,
    details: `Updated agenda item "${agendaItem.title}" (meeting ID: ${agendaItem.meeting_id})`,
  });

  return NextResponse.json(agendaItem);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("meetings:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.agendaItem.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Agenda item not found.");

  await prisma.agendaItem.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "AgendaItem",
    record_id: id,
    details: `Deleted agenda item "${existing.title}" (meeting ID: ${existing.meeting_id})`,
  });

  return NextResponse.json({ success: true });
});