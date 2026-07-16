import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function generateCaseNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BLT-${year}-${random}`;
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission("blotter:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const escalated = searchParams.get("escalated");
  const search = searchParams.get("search") || "";
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      status ? { status } : {},
      escalated ? { escalated: escalated === "true" } : {},
      date_from ? { incident_date: { gte: new Date(date_from) } } : {},
      date_to ? { incident_date: { lte: new Date(date_to) } } : {},
      search ? {
        OR: [
          { complainant_name: { contains: search, mode: "insensitive" } },
          { respondent_name: { contains: search, mode: "insensitive" } },
          { case_number: { contains: search, mode: "insensitive" } },
        ],
      } : {},
    ],
  };

  const [cases, total] = await Promise.all([
    prisma.blotterCase.findMany({
      where,
      skip,
      take: limit,
      include: { updates: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.blotterCase.count({ where }),
  ]);

  return NextResponse.json({ cases, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("blotter:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  // ensure unique case number
  let case_number = generateCaseNumber();
  let exists = await prisma.blotterCase.findUnique({ where: { case_number } });
  while (exists) {
    case_number = generateCaseNumber();
    exists = await prisma.blotterCase.findUnique({ where: { case_number } });
  }

  const blotterCase = await prisma.blotterCase.create({
    data: {
      case_number,
      complainant_id: body.complainant_id || null,
      complainant_name: body.complainant_name,
      complainant_contact: body.complainant_contact,
      complainant_address: body.complainant_address,
      respondent_id: body.respondent_id || null,
      respondent_name: body.respondent_name,
      incident_narrative: body.incident_narrative,
      incident_date: new Date(body.incident_date),
      hearing_date: body.hearing_date ? new Date(body.hearing_date) : null,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "BlotterCase",
    record_id: blotterCase.id,
    details: `Filed blotter case: ${case_number}`,
  });

  return NextResponse.json(blotterCase, { status: 201 });
}