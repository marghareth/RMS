// FILE: src/app/api/deceased-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { deceasedRecordCreateSchema, paginationSchema } from "@/lib/validations";

const residentSelect = {
  id: true,
  fname: true,
  lname: true,
  mname: true,
  name_extension: true,
  type_of_resident: true,
} as const;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("deceased:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search           = searchParams.get("search") || "";
  const underlying_cause = searchParams.get("underlying_cause");
  const date_from         = searchParams.get("date_from");
  const date_to           = searchParams.get("date_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      underlying_cause ? { underlying_cause } : {},
      date_from ? { date_of_death: { gte: new Date(date_from) } } : {},
      date_to   ? { date_of_death: { lte: new Date(date_to) } } : {},
      search
        ? {
            OR: [
              { immediate_cause: { contains: search, mode: "insensitive" } },
              { resident: { fname: { contains: search, mode: "insensitive" } } },
              { resident: { lname: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [records, total] = await Promise.all([
    prisma.deceasedRecord.findMany({
      where,
      skip,
      take: limit,
      include: { resident: { select: residentSelect } },
      orderBy: { date_of_death: "desc" },
    }),
    prisma.deceasedRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("deceased:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = deceasedRecordCreateSchema.parse(await req.json());

  const resident = await prisma.resident.findUnique({ where: { id: body.resident_id } });
  if (!resident) {
    throw new ApiError(404, "NOT_FOUND", "Selected resident was not found.");
  }

  const existing = await prisma.deceasedRecord.findUnique({ where: { resident_id: body.resident_id } });
  if (existing) {
    throw new ApiError(409, "DUPLICATE", "This resident already has a deceased record on file.");
  }

  // A resident's `is_deceased` flag must stay in sync with the presence of a
  // DeceasedRecord — do both writes atomically so other modules (household
  // counts, dashboard stats, certificate eligibility) never see a resident
  // marked alive with a death record on file, or vice versa.
  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.deceasedRecord.create({
      data: {
        resident_id:      body.resident_id,
        date_of_death:    body.date_of_death,
        immediate_cause:  body.immediate_cause,
        underlying_cause: body.underlying_cause ?? null,
        recorded_by:      parseInt(auth.session.user.id),
      },
      include: { resident: { select: residentSelect } },
    });
    await tx.resident.update({
      where: { id: body.resident_id },
      data: { is_deceased: true },
    });
    return created;
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "CREATE",
    table_affected: "DeceasedRecord",
    record_id:      record.id,
    details:        `Recorded death of resident: ${record.resident.fname} ${record.resident.lname}`,
  });

  return NextResponse.json(record, { status: 201 });
});