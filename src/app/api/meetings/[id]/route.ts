// FILE: src/app/api/meetings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { meetingUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("meetings:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const meeting = await prisma.meetingRecord.findUnique({
    where: { id: parseInt(idParam) },
    include: { recorder: { select: { id: true, username: true } } },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("meetings:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = meetingUpdateSchema.parse(await req.json());

  const meeting = await prisma.meetingRecord.update({
    where: { id },
    data: {
      meeting_type: body.meeting_type,
      meeting_date: body.meeting_date,
      minutes: "minutes" in body ? body.minutes ?? null : undefined,
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
});