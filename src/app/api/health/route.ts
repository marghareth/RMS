// FILE: src/app/api/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { healthRecordCreateSchema, paginationSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("health:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const search = searchParams.get("search") || "";
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      resident_id ? { resident_id: parseInt(resident_id) } : {},
      search
        ? {
            OR: [
              { record_type: { contains: search, mode: "insensitive" } },
              { resident: { fname: { contains: search, mode: "insensitive" } } },
              { resident: { lname: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [records, total] = await Promise.all([
    prisma.healthRecord.findMany({
      where,
      skip,
      take: limit,
      include: { resident: true, recorder: { select: { id: true, username: true } } },
      orderBy: { recorded_at: "desc" },
    }),
    prisma.healthRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("health:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = healthRecordCreateSchema.parse(await req.json());

  const record = await prisma.healthRecord.create({
    data: {
      resident_id: body.resident_id,
      record_type: body.record_type,
      notes: body.notes ?? null,
      recorded_by: parseInt(auth.session.user.id),
    },
    include: { resident: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "HealthRecord",
    record_id: record.id,
    details: `Added health record for resident ID: ${body.resident_id}`,
  });

  return NextResponse.json(record, { status: 201 });
});