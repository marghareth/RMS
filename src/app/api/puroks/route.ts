import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET() {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const puroks = await prisma.purok.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(puroks);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("settings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const purok = await prisma.purok.create({ data: { name: body.name } });
  return NextResponse.json(purok, { status: 201 });
}