import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("users:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      is_active: true,
      created_at: true,
    },
    orderBy: { username: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("users:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const existing = await prisma.user.findUnique({
    where: { username: body.username },
  });

  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      username: body.username,
      password_hash,
      role: body.role,
    },
    select: {
      id: true,
      username: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "User",
    record_id: user.id,
    details: `Created user: ${user.username} with role: ${user.role}`,
  });

  return NextResponse.json(user, { status: 201 });
}