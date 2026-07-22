// FILE: src/app/api/officials/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("officials:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await params;
  const official = await prisma.brgyOfficial.findUnique({
    where: { id: parseInt(idParam) },
    include: { resident: true },
  });

  if (!official) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(official);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("officials:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id: idParam } = await params;
  const id = parseInt(idParam);

  const official = await prisma.brgyOfficial.update({
    where: { id },
    data: {
      position: body.position,
      purok_assignment: body.purok_assignment,
      term_start: body.term_start ? new Date(body.term_start) : undefined,
      term_end: body.term_end ? new Date(body.term_end) : undefined,
      is_active: body.is_active,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "BrgyOfficial",
    record_id: id,
    details: `Updated official ID: ${id}`,
  });

  return NextResponse.json(official);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("officials:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await params;
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
}