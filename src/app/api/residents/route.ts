import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search       = searchParams.get("search") || "";
  const purok_id     = searchParams.get("purok_id");
  const sex          = searchParams.get("sex");
  const civil_status = searchParams.get("civil_status");
  const is_archived  = searchParams.get("is_archived") === "true";
  const unassigned   = searchParams.get("unassigned") === "true";
  const page         = parseInt(searchParams.get("page")  || "1");
  const limit        = parseInt(searchParams.get("limit") || "20");
  const skip         = (page - 1) * limit;

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
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();

    // Duplicate check: same name + birthdate
    const existing = await prisma.resident.findFirst({
      where: {
        fname:     { equals: body.fname,     mode: "insensitive" },
        lname:     { equals: body.lname,     mode: "insensitive" },
        birthdate: new Date(body.birthdate),
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

    const resident = await prisma.resident.create({
      data: {
        fname:                  body.fname,
        lname:                  body.lname,
        mname:                  body.mname                  ?? null,
        name_extension:         body.name_extension         ?? null,
        birthdate:              new Date(body.birthdate),
        place_of_birth:         body.place_of_birth         ?? null,
        sex:                    body.sex,
        civil_status:           body.civil_status,
        citizenship:            body.citizenship            || "Filipino",
        religion:               body.religion               ?? null,
        nationality:            body.nationality            || "Filipino",
        employment_status:      body.employment_status      ?? null,
        educational_attainment: body.educational_attainment ?? null,
        occupation:             body.occupation             ?? null,
        income_bracket:         body.income_bracket         ?? null,
        sector:                 body.sector                 ?? null,
        purok_id:               body.purok_id               ?? null,
        household_id:           body.household_id           ?? null,
      },
    });

    await logAudit({
      user_id:        parseInt(auth.session.user.id),
      action:         "CREATE",
      table_affected: "Resident",
      record_id:      resident.id,
      details:        `Created resident: ${resident.fname} ${resident.lname}`,
    });

    return NextResponse.json(resident, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/residents failed:", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: e?.message || "Failed to create resident." },
      { status: 500 }
    );
  }
}