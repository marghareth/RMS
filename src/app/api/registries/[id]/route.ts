import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("registries:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const registry = await prisma.specialRegistry.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      resident: {
        include: {
          purok: true,
          household: { include: { _count: { select: { members: true } } } },
        },
      },
    },
  });

  if (!registry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(registry);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("registries:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const registry = await prisma.specialRegistry.update({
    where: { id },
    data: {
      disability_type: body.disability_type,
      is_4ps_beneficiary: body.is_4ps_beneficiary,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "SpecialRegistry",
    record_id: id,
    details: `Updated registry ID: ${id}`,
  });

  return NextResponse.json(registry);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("registries:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);
  await prisma.specialRegistry.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "SpecialRegistry",
    record_id: id,
    details: `Removed from registry ID: ${id}`,
  });

  return NextResponse.json({ message: "Removed from registry" });
}