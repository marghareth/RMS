import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// ── Generate household number e.g. HHNP100000001 ──────────────────────────────
async function generateHouseholdNo(): Promise<string> {
  const count = await prisma.household.count();
  const padded = String(count + 1).padStart(9, "0");
  return `HHNP1${padded}`;
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission("households:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const purok_id = searchParams.get("purok_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = purok_id ? { purok_id: parseInt(purok_id) } : {};

  const [households, total] = await Promise.all([
    prisma.household.findMany({
      where,
      skip,
      take: limit,
      include: {
        purok: true,
        household_head: true,
        members: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.household.count({ where }),
  ]);

  return NextResponse.json({ households, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();

    if (!body.purok_id || !body.address) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Purok and address are required." },
        { status: 400 }
      );
    }

    const purok = await prisma.purok.findUnique({ where: { id: Number(body.purok_id) } });
    if (!purok) {
      return NextResponse.json(
        {
          error: "INVALID_PUROK",
          message: `Purok ${body.purok_id} does not exist in the database. Refresh the page and re-select a purok from the dropdown.`,
        },
        { status: 400 }
      );
    }

    const household_no = await generateHouseholdNo();

    const household = await prisma.household.create({
      data: {
        household_no,
        purok_id: Number(body.purok_id),
        household_head_id: body.household_head_id ?? null,
        address: body.address,
        housing_type: body.housing_type ?? null,
        water_source: body.water_source ?? null,
        comfort_room: body.comfort_room ?? null,
      },
    });

    await logAudit({
      user_id: parseInt(auth.session.user.id),
      action: "CREATE",
      table_affected: "Household",
      record_id: household.id,
      details: `Created household ${household.household_no} at: ${household.address}`,
    });

    return NextResponse.json(household, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/households failed:", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: e?.message || "Failed to create household." },
      { status: 500 }
    );
  }
}