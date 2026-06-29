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
      household: true,
      certificates: { orderBy: { issued_at: "desc" } },
      special_registries: true,
      health_records: { orderBy: { recorded_at: "desc" } },
      vaccinations: { orderBy: { date_given: "desc" } },
      barangay_ids: true,
      official: true,
    },
  });

  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(resident);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const resident = await prisma.resident.update({
    where: { id },
    data: {
      fname: body.fname,
      lname: body.lname,
      mname: body.mname,
      birthdate: body.birthdate ? new Date(body.birthdate) : undefined,
      sex: body.sex,
      civil_status: body.civil_status,
      religion: body.religion,
      nationality: body.nationality,
      employment_status: body.employment_status,
      educational_attainment: body.educational_attainment,
      income_bracket: body.income_bracket,
      purok_id: body.purok_id,
      household_id: body.household_id,
      is_archived: body.is_archived,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Resident",
    record_id: id,
    details: `Updated resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json(resident);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);

  // soft delete only
  const resident = await prisma.resident.update({
    where: { id },
    data: { is_archived: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "ARCHIVE",
    table_affected: "Resident",
    record_id: id,
    details: `Archived resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json({ message: "Resident archived successfully" });
}