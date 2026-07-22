// FILE: src/app/api/barangay-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function generateIdNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BID-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission("barangay_id:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = resident_id ? { resident_id: parseInt(resident_id) } : {};

  const [ids, total] = await Promise.all([
    prisma.barangayId.findMany({
      where,
      skip,
      take: limit,
      include: {
        resident: { include: { purok: true, household: true } },
        issuer: { select: { id: true, username: true } },
      },
      orderBy: { issued_date: "desc" },
    }),
    prisma.barangayId.count({ where }),
  ]);

  return NextResponse.json({ ids, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("barangay_id:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  if (!body.resident_id) {
    return NextResponse.json({ error: "resident_id is required" }, { status: 400 });
  }

  const resident = await prisma.resident.findUnique({ where: { id: body.resident_id } });
  if (!resident) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  // A resident should only hold one barangay ID at a time. resident_id isn't
  // @unique on the model, so this has to be enforced here rather than by a
  // DB constraint.
  const existing = await prisma.barangayId.findFirst({ where: { resident_id: body.resident_id } });
  if (existing) {
    return NextResponse.json(
      { error: "DUPLICATE_ID", message: "This resident already has a barangay ID on file." },
      { status: 409 }
    );
  }

  let id_number = generateIdNumber();
  let exists = await prisma.barangayId.findUnique({ where: { id_number } });
  while (exists) {
    id_number = generateIdNumber();
    exists = await prisma.barangayId.findUnique({ where: { id_number } });
  }

  const barangayId = await prisma.barangayId.create({
    data: {
      resident_id: body.resident_id,
      id_number,
      issued_by: parseInt(auth.session.user.id),
    },
    include: {
      resident: { include: { purok: true, household: true } },
      issuer: { select: { id: true, username: true } },
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "BarangayId",
    record_id: barangayId.id,
    details: `Generated barangay ID: ${id_number}`,
  });

  return NextResponse.json(barangayId, { status: 201 });
}