import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("households:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const household = await prisma.household.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      purok: true,
      household_head: true,
      members: true,
    },
  });

  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(household);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const household = await prisma.household.update({
    where: { id },
    data: {
      purok_id: body.purok_id,
      household_head_id: body.household_head_id,
      address: body.address,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Household",
    record_id: id,
    details: `Updated household: ${household.address}`,
  });

  return NextResponse.json(household);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);
  await prisma.household.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "Household",
    record_id: id,
    details: `Deleted household ID: ${id}`,
  });

  return NextResponse.json({ message: "Household deleted" });
}