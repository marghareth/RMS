// FILE: src/app/api/calendar-events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { calendarEventUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("calendar:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const event = await prisma.calendarEvent.findUnique({
    where: { id: parseInt(idParam) },
    include: {
      creator: { select: { id: true, username: true } },
      meeting: { select: { id: true, title: true, meeting_type: true } },
    },
  });

  if (!event) throw new ApiError(404, "NOT_FOUND", "Calendar event not found.");
  return NextResponse.json(event);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("calendar:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = calendarEventUpdateSchema.parse(await req.json());

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Calendar event not found.");

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: body.title,
      description: "description" in body ? body.description ?? null : undefined,
      event_date: body.event_date,
      event_type: "event_type" in body ? body.event_type ?? null : undefined,
      meeting_id: "meeting_id" in body ? body.meeting_id ?? null : undefined,
    },
    include: {
      creator: { select: { id: true, username: true } },
      meeting: { select: { id: true, title: true, meeting_type: true } },
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "CalendarEvent",
    record_id: id,
    details: `Updated calendar event: ${event.title}`,
  });

  return NextResponse.json(event);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("calendar:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Calendar event not found.");

  await prisma.calendarEvent.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "CalendarEvent",
    record_id: id,
    details: `Deleted calendar event: ${existing.title}`,
  });

  return NextResponse.json({ message: "Calendar event deleted successfully" });
});