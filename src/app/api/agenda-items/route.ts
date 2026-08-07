// FILE: src/app/api/agenda-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { agendaItemCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("meetings:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const meeting_id = searchParams.get("meeting_id");
  if (!meeting_id) {
    throw new ApiError(400, "VALIDATION_ERROR", "meeting_id query param is required.");
  }

  const agendaItems = await prisma.agendaItem.findMany({
    where: { meeting_id: parseInt(meeting_id) },
    orderBy: { sort_order: "asc" },
  });

  return NextResponse.json({ agendaItems });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("meetings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = agendaItemCreateSchema.parse(await req.json());

  const meeting = await prisma.meetingRecord.findUnique({ where: { id: body.meeting_id } });
  if (!meeting) throw new ApiError(404, "NOT_FOUND", "Meeting record not found.");

  // Default sort_order to "end of list" when not explicitly provided.
  let sort_order = body.sort_order;
  if (!sort_order) {
    const last = await prisma.agendaItem.findFirst({
      where: { meeting_id: body.meeting_id },
      orderBy: { sort_order: "desc" },
    });
    sort_order = (last?.sort_order ?? 0) + 1;
  }

  const agendaItem = await prisma.agendaItem.create({
    data: {
      meeting_id: body.meeting_id,
      title: body.title,
      description: body.description ?? null,
      sort_order,
      status: body.status ?? "PENDING",
      minutes: body.minutes ?? null,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "AgendaItem",
    record_id: agendaItem.id,
    details: `Added agenda item "${body.title}" to meeting ID: ${body.meeting_id}`,
  });

  return NextResponse.json(agendaItem, { status: 201 });
});