import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("meetings:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const meeting = await prisma.meetingRecord.findUnique({
    where: { id: parseInt(params.id) },
    include: { recorder: { select: { id: true, username: true } } },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("meetings:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const meeting = await prisma.meetingRecord.update({
    where: { id },
    data: {
      meeting_type: body.meeting_type,
      meeting_date: body.meeting_date ? new Date(body.meeting_date) : undefined,
      minutes: body.minutes,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "MeetingRecord",
    record_id: id,
    details: `Updated meeting record ID: ${id}`,
  });

  return NextResponse.json(meeting);
}