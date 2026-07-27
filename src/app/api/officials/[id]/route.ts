// FILE: src/app/api/officials/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { officialUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("officials:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const official = await prisma.brgyOfficial.findUnique({
    where: { id: parseInt(idParam) },
    include: { resident: { include: { purok: true, household: true } } },
  });

  if (!official) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(official);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("officials:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = officialUpdateSchema.parse(await req.json());

  const official = await prisma.brgyOfficial.update({
    where: { id },
    data: {
      position: body.position,
      contact_no: "contact_no" in body ? body.contact_no ?? null : undefined,
      purok_assignment: "purok_assignment" in body ? body.purok_assignment ?? null : undefined,
      term_start: body.term_start,
      term_end: "term_end" in body ? body.term_end ?? null : undefined,
      is_active: body.is_active,
    },
    include: { resident: { include: { purok: true, household: true } } },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "BrgyOfficial",
    record_id: id,
    details: `Updated official ID: ${id}`,
  });

  return NextResponse.json(official);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("officials:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  await prisma.brgyOfficial.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "BrgyOfficial",
    record_id: id,
    details: `Deleted official ID: ${id}`,
  });

  return NextResponse.json({ message: "Official deleted" });
});