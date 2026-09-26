// FILE: src/app/api/visitor-logs/[id]/checkout/route.ts
//
// Marks a visitor as checked out (sets time_out = now). Split out from the
// generic PATCH /api/visitor-logs/[id] route because checkout isn't a
// user-editable field on the log entry — it's a one-way action — and the
// existing visitorLogUpdateSchema deliberately doesn't expose time_out.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("visitors:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.visitorLog.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Visitor log entry not found");
  if (existing.time_out) {
    throw new ApiError(400, "ALREADY_CHECKED_OUT", "This visitor is already checked out.");
  }

  const visitor = await prisma.visitorLog.update({
    where: { id },
    data: { time_out: new Date() },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "VisitorLog",
    record_id: id,
    details: `Checked out visitor: ${visitor.visitor_name}`,
  });

  return NextResponse.json(visitor);
});