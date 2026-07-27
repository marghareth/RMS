// FILE: src/app/api/health/vaccinations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { vaccinationCreateSchema, paginationSchema } from "@/lib/validations";

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
              { vaccine_name: { contains: search, mode: "insensitive" } },
              { resident: { fname: { contains: search, mode: "insensitive" } } },
              { resident: { lname: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [vaccinations, total] = await Promise.all([
    prisma.vaccination.findMany({
      where,
      skip,
      take: limit,
      include: { resident: true, recorder: { select: { id: true, username: true } } },
      orderBy: { date_given: "desc" },
    }),
    prisma.vaccination.count({ where }),
  ]);

  return NextResponse.json({ vaccinations, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("health:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = vaccinationCreateSchema.parse(await req.json());

  const vaccination = await prisma.vaccination.create({
    data: {
      resident_id: body.resident_id,
      vaccine_name: body.vaccine_name,
      date_given: body.date_given,
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
});