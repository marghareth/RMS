// FILE: src/app/api/visitor-logs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { visitorLogUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("visitors:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const visitor = await prisma.visitorLog.findUnique({ where: { id: parseInt(idParam) } });

  if (!visitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(visitor);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("visitors:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = visitorLogUpdateSchema.parse(await req.json());

  const visitor = await prisma.visitorLog.update({
    where: { id },
    data: {
      visitor_name:    body.visitor_name,
      contact:         "contact" in body ? body.contact ?? null : undefined,
      purpose:         body.purpose,
      person_to_visit: "person_to_visit" in body ? body.person_to_visit ?? null : undefined,
    },
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "UPDATE",
    table_affected: "VisitorLog",
    record_id:      id,
    details:        `Updated visitor log entry: ${visitor.visitor_name}`,
  });

  return NextResponse.json(visitor);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("visitors:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const visitor = await prisma.visitorLog.delete({ where: { id } });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "DELETE",
    table_affected: "VisitorLog",
    record_id:      id,
    details:        `Deleted visitor log entry: ${visitor.visitor_name}`,
  });

  return NextResponse.json({ message: "Visitor log entry deleted" });
});