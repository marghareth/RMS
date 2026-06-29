import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("users:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: parseInt(params.id) },
    select: {
      id: true,
      username: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("users:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const data: any = {
    role: body.role,
    is_active: body.is_active,
  };

  if (body.password) {
    data.password_hash = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      is_active: true,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "User",
    record_id: id,
    details: `Updated user ID: ${id}`,
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("users:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);

  await prisma.user.update({
    where: { id },
    data: { is_active: false },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DEACTIVATE",
    table_affected: "User",
    record_id: id,
    details: `Deactivated user ID: ${id}`,
  });

  return NextResponse.json({ message: "User deactivated" });
}