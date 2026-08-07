// FILE: src/app/api/calendar-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { calendarEventCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("calendar:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");

  // The month-grid view always requests a bounded range (the visible
  // weeks), but support an unbounded list too for anything that just
  // wants "everything" (e.g. a future upcoming-events widget).
  const where: any = {
    AND: [
      date_from ? { event_date: { gte: new Date(date_from) } } : {},
      date_to ? { event_date: { lte: new Date(date_to) } } : {},
    ],
  };

  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      creator: { select: { id: true, username: true } },
      meeting: { select: { id: true, title: true, meeting_type: true } },
    },
    orderBy: { event_date: "asc" },
  });

  return NextResponse.json(events);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("calendar:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = calendarEventCreateSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);

  const event = await prisma.calendarEvent.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      event_date: body.event_date,
      event_type: body.event_type ?? null,
      meeting_id: body.meeting_id ?? null,
      created_by: userId,
    },
    include: {
      creator: { select: { id: true, username: true } },
      meeting: { select: { id: true, title: true, meeting_type: true } },
    },
  });

  await logAudit({
    user_id: userId,
    action: "CREATE",
    table_affected: "CalendarEvent",
    record_id: event.id,
    details: `Added calendar event: ${event.title}`,
  });

  return NextResponse.json(event, { status: 201 });
});