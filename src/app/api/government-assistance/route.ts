// FILE: src/app/api/government-assistance/route.ts
//
// Government assistance records only ever make sense scoped to a single
// resident, so there's no GET-list here — they're fetched as part of
// GET /api/residents/[id] (see the `government_assistance` include there).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { governmentAssistanceCreateSchema } from "@/lib/validations";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = governmentAssistanceCreateSchema.parse(await req.json());

  const resident = await prisma.resident.findUnique({ where: { id: body.resident_id } });
  if (!resident) {
    throw new ApiError(404, "NOT_FOUND", "Resident not found.");
  }

  const assistance = await prisma.governmentAssistance.create({
    data: {
      resident_id: body.resident_id,
      program_name: body.program_name,
      date_enrolled: body.date_enrolled ?? null,
      notes: body.notes ?? null,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "GovernmentAssistance",
    record_id: assistance.id,
    details: `Enrolled ${resident.fname} ${resident.lname} in program: ${assistance.program_name}`,
  });

  return NextResponse.json(assistance, { status: 201 });
});