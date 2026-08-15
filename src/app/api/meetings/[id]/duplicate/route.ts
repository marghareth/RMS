// FILE: src/app/api/meetings/[id]/duplicate/route.ts
//
// POST { meeting_date } — clones this meeting's type/title/location and
// agenda items onto a new date, as a fresh SCHEDULED meeting. Deliberately
// does NOT copy minutes or agenda item status/minutes — a duplicate is a
// new session, not a copy of what already happened at the last one.
//
// This is the lightweight alternative to a full recurrence-rule engine:
// for a weekly SB session, staff open last week's meeting, hit "Duplicate",
// pick next week's date, and get the same agenda structure ready to go
// instead of retyping every agenda item by hand.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { meetingDuplicateSchema } from "@/lib/validations";

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("meetings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const sourceId = parseInt(idParam);
  const { meeting_date } = meetingDuplicateSchema.parse(await req.json());

  const source = await prisma.meetingRecord.findUnique({
    where: { id: sourceId },
    include: { agenda_items: { orderBy: { sort_order: "asc" } } },
  });
  if (!source) throw new ApiError(404, "NOT_FOUND", "Meeting record not found.");

  const userId = parseInt(auth.session.user.id);

  const duplicate = await prisma.meetingRecord.create({
    data: {
      meeting_type: source.meeting_type,
      meeting_date,
      title: source.title,
      location: source.location,
      status: "SCHEDULED",
      recorded_by: userId,
      // Deliberately blank — this is a new session, not a copy of what was
      // discussed last time.
      minutes: null,
      agenda_items: {
        create: source.agenda_items.map((a: { title: string; description: string | null; sort_order: number }) => ({
          title: a.title,
          description: a.description,
          sort_order: a.sort_order,
          status: "PENDING",
          minutes: null,
        })),
      },
    },
  });

  await logAudit({
    user_id: userId,
    action: "CREATE",
    table_affected: "MeetingRecord",
    record_id: duplicate.id,
    details: `Duplicated meeting #${sourceId} (${source.title ?? source.meeting_type}) onto ${meeting_date.toISOString().slice(0, 10)}, carrying over ${source.agenda_items.length} agenda item(s)`,
  });

  return NextResponse.json(duplicate, { status: 201 });
});