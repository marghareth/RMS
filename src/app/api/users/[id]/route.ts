// FILE: src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { userUpdateSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(idParam) },
    select: { id: true, username: true, role: true, is_active: true, created_at: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = userUpdateSchema.parse(await req.json());

  const data: any = { role: body.role, is_active: body.is_active };
  if (body.password) {
    data.password_hash = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, is_active: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "User",
    record_id: id,
    details: `Updated user ID: ${id}`,
  });

  return NextResponse.json(user);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  await prisma.user.update({ where: { id }, data: { is_active: false } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DEACTIVATE",
    table_affected: "User",
    record_id: id,
    details: `Deactivated user ID: ${id}`,
  });

  return NextResponse.json({ message: "User deactivated" });
});