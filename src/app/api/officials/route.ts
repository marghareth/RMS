// FILE: src/app/api/officials/route.ts
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
    include: { resident: { include: { purok: true, household: true } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(officials);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("officials:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  if (!body.resident_id) {
    return NextResponse.json({ error: "resident_id is required" }, { status: 400 });
  }

  // resident_id is @unique on BrgyOfficial — a resident can only hold one
  // official record at a time. Checked here first so the error is friendly
  // rather than a raw Prisma unique-constraint failure.
  const existing = await prisma.brgyOfficial.findUnique({ where: { resident_id: body.resident_id } });
  if (existing) {
    return NextResponse.json(
      { error: "DUPLICATE_OFFICIAL", message: "This resident already has an official record on file." },
      { status: 409 }
    );
  }

  const official = await prisma.brgyOfficial.create({
    data: {
      resident_id: body.resident_id,
      position: body.position,
      contact_no: body.contact_no || null,
      purok_assignment: body.purok_assignment || null,
      term_start: new Date(body.term_start),
      term_end: body.term_end ? new Date(body.term_end) : null,
      is_active: body.is_active ?? true,
    },
    include: { resident: { include: { purok: true, household: true } } },
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