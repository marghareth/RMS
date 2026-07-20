import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("meetings:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const meeting_type = searchParams.get("meeting_type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      meeting_type ? { meeting_type } : {},
      date_from ? { meeting_date: { gte: new Date(date_from) } } : {},
      date_to ? { meeting_date: { lte: new Date(date_to) } } : {},
    ],
  };

  const [meetings, total] = await Promise.all([
    prisma.meetingRecord.findMany({
      where,
      skip,
      take: limit,
      include: {
        recorder: { select: { id: true, username: true } },
      },
      orderBy: { meeting_date: "desc" },
    }),
    prisma.meetingRecord.count({ where }),
  ]);

  return NextResponse.json({ meetings, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("meetings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const meeting = await prisma.meetingRecord.create({
    data: {
      meeting_type: body.meeting_type,
      meeting_date: new Date(body.meeting_date),
      minutes: body.minutes || null,
      recorded_by: parseInt(auth.session.user.id),
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "MeetingRecord",
    record_id: meeting.id,
    details: `Created ${body.meeting_type} meeting record`,
  });

  return NextResponse.json(meeting, { status: 201 });
}