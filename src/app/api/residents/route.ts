import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { residentCreateSchema, paginationSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search       = searchParams.get("search") || "";
  const purok_id     = searchParams.get("purok_id");
  const sex          = searchParams.get("sex");
  const civil_status = searchParams.get("civil_status");
  const is_archived  = searchParams.get("is_archived") === "true";
  const unassigned   = searchParams.get("unassigned") === "true";
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    is_archived,
    AND: [
      search
        ? {
            OR: [
              { fname: { contains: search, mode: "insensitive" } },
              { lname: { contains: search, mode: "insensitive" } },
              { mname: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      purok_id     ? { purok_id:     parseInt(purok_id) } : {},
      sex          ? { sex }                              : {},
      civil_status ? { civil_status }                     : {},
      unassigned   ? { household_id: null }                : {},
    ],
  };

  const [residents, total] = await Promise.all([
    prisma.resident.findMany({
      where,
      skip,
      take: limit,
      include: {
        purok: true,
        household: true,
      },
      orderBy: { lname: "asc" },
    }),
    prisma.resident.count({ where }),
  ]);

  return NextResponse.json({ residents, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = residentCreateSchema.parse(await req.json());

  // Duplicate check: same name + birthdate
  const existing = await prisma.resident.findFirst({
    where: {
      fname:     { equals: body.fname,     mode: "insensitive" },
      lname:     { equals: body.lname,     mode: "insensitive" },
      birthdate: body.birthdate,
    },
  });

  if (existing) {
    return NextResponse.json(
      {
        error:    "DUPLICATE",
        message:  "A resident with the same name and birthdate already exists.",
        existing,
      },
      { status: 409 }
    );
  }

  const resident = await prisma.resident.create({ data: body });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "CREATE",
    table_affected: "Resident",
    record_id:      resident.id,
    details:        `Created resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json(resident, { status: 201 });
});