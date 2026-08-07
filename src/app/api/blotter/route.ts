// FILE: src/app/api/blotter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { blotterCreateSchema, paginationSchema } from "@/lib/validations";

function generateCaseNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BLT-${year}-${random}`;
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("blotter:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const escalated = searchParams.get("escalated");
  const incident_type = searchParams.get("incident_type");
  const search = searchParams.get("search") || "";
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      status ? { status } : {},
      escalated ? { escalated: escalated === "true" } : {},
      incident_type ? { incident_type } : {},
      date_from ? { incident_date: { gte: new Date(date_from) } } : {},
      date_to ? { incident_date: { lte: new Date(date_to) } } : {},
      search
        ? {
            OR: [
              { complainant_name: { contains: search, mode: "insensitive" } },
              { respondent_name: { contains: search, mode: "insensitive" } },
              { case_number: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
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
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("blotter:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = blotterCreateSchema.parse(await req.json());

  // ensure unique case number
  let case_number = generateCaseNumber();
  while (await prisma.blotterCase.findUnique({ where: { case_number } })) {
    case_number = generateCaseNumber();
  }

  const blotterCase = await prisma.blotterCase.create({
    data: {
      case_number,
      complainant_id: body.complainant_id ?? null,
      complainant_name: body.complainant_name,
      complainant_contact: body.complainant_contact ?? null,
      complainant_address: body.complainant_address ?? null,
      respondent_id: body.respondent_id ?? null,
      respondent_name: body.respondent_name,
      incident_narrative: body.incident_narrative,
      incident_date: body.incident_date,
      incident_type: body.incident_type,
      hearing_date: body.hearing_date ?? null,
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
});