import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const resident = await prisma.resident.findUnique({
    where: { id: parseInt(params.id) },
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id   = parseInt(params.id);

  const resident = await prisma.resident.update({
    where: { id },
    data: {
      fname:                  body.fname,
      lname:                  body.lname,
      mname:                  body.mname                  ?? null,
      name_extension:         body.name_extension         ?? null,
      birthdate:              body.birthdate ? new Date(body.birthdate) : undefined,
      place_of_birth:         body.place_of_birth         ?? null,
      sex:                    body.sex,
      civil_status:           body.civil_status,
      citizenship:            body.citizenship,
      religion:               body.religion               ?? null,
      nationality:            body.nationality,
      employment_status:      body.employment_status      ?? null,
      educational_attainment: body.educational_attainment ?? null,
      occupation:             body.occupation             ?? null,
      income_bracket:         body.income_bracket         ?? null,
      sector:                 body.sector                 ?? null,
      purok_id:               body.purok_id               ?? null,
      household_id:           body.household_id           ?? null,
      is_archived:            body.is_archived,
    },
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "UPDATE",
    table_affected: "Resident",
    record_id:      id,
    details:        `Updated resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json(resident);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);

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