import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("officials:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const is_active = searchParams.get("is_active");

  const where: any = is_active !== null ? { is_active: is_active === "true" } : {};

  const officials = await prisma.brgyOfficial.findMany({
    where,
    include: { resident: true },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(officials);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("officials:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const official = await prisma.brgyOfficial.create({
    data: {
      resident_id: body.resident_id,
      position: body.position,
      purok_assignment: body.purok_assignment || null,
      term_start: new Date(body.term_start),
      term_end: body.term_end ? new Date(body.term_end) : null,
      is_active: body.is_active ?? true,
    },
    include: { resident: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "BrgyOfficial",
    record_id: official.id,
    details: `Added official: ${official.position}`,
  });

  return NextResponse.json(official, { status: 201 });
}