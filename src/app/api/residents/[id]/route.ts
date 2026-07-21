// FILE: src/app/api/residents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await params;
  const resident = await prisma.resident.findUnique({
    where: { id: parseInt(idParam) },
    include: {
      purok: true,
      household: {
        include: {
          members: {
            where: { is_archived: false },
            orderBy: { lname: "asc" },
          },
        },
      },
      certificates:       { orderBy: { issued_at:    "desc" } },
      special_registries: true,
      health_records:     { orderBy: { recorded_at:  "desc" } },
      vaccinations:       { orderBy: { date_given:   "desc" } },
      barangay_ids:       true,
      official:           true,
    },
  });

  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resident);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await params;

  try {
    const body = await req.json();
    const id   = parseInt(idParam);

    // Partial update: only touch fields actually present in the request
    // body. Previously every field used `body.x ?? null`, which meant a
    // PATCH sending only `{ household_id }` silently wiped out purok_id,
    // sector, occupation, etc. by setting them to null. Now a field is
    // only written if the caller explicitly included it.
    const data: Record<string, any> = {};

    const directFields = ["fname", "lname", "sex", "civil_status", "citizenship", "nationality", "is_archived"] as const;
    for (const key of directFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const nullableFields = [
      "mname", "name_extension", "place_of_birth", "religion", "employment_status",
      "educational_attainment", "occupation", "income_bracket", "sector",
      "purok_id", "household_id",
    ] as const;
    for (const key of nullableFields) {
      if (key in body) data[key] = body[key] ?? null;
    }

    if ("birthdate" in body) {
      data.birthdate = body.birthdate ? new Date(body.birthdate) : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "No fields to update." },
        { status: 400 }
      );
    }

    const resident = await prisma.resident.update({ where: { id }, data });

    await logAudit({
      user_id:        parseInt(auth.session.user.id),
      action:         "UPDATE",
      table_affected: "Resident",
      record_id:      id,
      details:        `Updated resident: ${resident.fname} ${resident.lname}`,
    });

    return NextResponse.json(resident);
  } catch (e: any) {
    console.error(`PATCH /api/residents/${idParam} failed:`, e);
    if (e.code === "P2025") {
      return NextResponse.json({ error: "NOT_FOUND", message: "Resident not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "SERVER_ERROR", message: e?.message || "Failed to update resident." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await params;
  const id = parseInt(idParam);

  // Soft delete only — never hard delete residents
  const resident = await prisma.resident.update({
    where: { id },
    data:  { is_archived: true },
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "ARCHIVE",
    table_affected: "Resident",
    record_id:      id,
    details:        `Archived resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json({ message: "Resident archived successfully" });
}