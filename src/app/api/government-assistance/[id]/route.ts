// FILE: src/app/api/government-assistance/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { governmentAssistanceUpdateSchema } from "@/lib/validations";

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = governmentAssistanceUpdateSchema.parse(await req.json());

  const assistance = await prisma.governmentAssistance.update({
    where: { id },
    data: {
      program_name: body.program_name,
      date_enrolled: "date_enrolled" in body ? body.date_enrolled ?? null : undefined,
      notes: "notes" in body ? body.notes ?? null : undefined,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "GovernmentAssistance",
    record_id: id,
    details: `Updated assistance program record: ${assistance.program_name}`,
  });

  return NextResponse.json(assistance);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const assistance = await prisma.governmentAssistance.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "GovernmentAssistance",
    record_id: id,
    details: `Removed assistance program record: ${assistance.program_name}`,
  });

  return NextResponse.json({ message: "Assistance record removed" });
});