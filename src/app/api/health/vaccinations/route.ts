import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("health:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = resident_id ? { resident_id: parseInt(resident_id) } : {};

  const [vaccinations, total] = await Promise.all([
    prisma.vaccination.findMany({
      where,
      skip,
      take: limit,
      include: {
        resident: true,
        recorder: { select: { id: true, username: true } },
      },
      orderBy: { date_given: "desc" },
    }),
    prisma.vaccination.count({ where }),
  ]);

  return NextResponse.json({ vaccinations, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("health:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const vaccination = await prisma.vaccination.create({
    data: {
      resident_id: body.resident_id,
      vaccine_name: body.vaccine_name,
      date_given: new Date(body.date_given),
      recorded_by: parseInt(auth.session.user.id),
    },
    include: { resident: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "Vaccination",
    record_id: vaccination.id,
    details: `Added vaccination record for resident ID: ${body.resident_id}`,
  });

  return NextResponse.json(vaccination, { status: 201 });
}