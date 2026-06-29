import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("equipment:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const is_returned = searchParams.get("is_returned");

  const where: any = is_returned === "false" ? { actual_return: null } : {};

  // auto flag overdue
  await prisma.equipmentBorrowing.updateMany({
    where: {
      actual_return: null,
      expected_return: { lt: new Date() },
      is_overdue: false,
    },
    data: { is_overdue: true },
  });

  const borrowings = await prisma.equipmentBorrowing.findMany({
    where,
    include: {
      equipment: true,
      resident: true,
      recorder: { select: { id: true, username: true } },
    },
    orderBy: { date_borrowed: "desc" },
  });

  return NextResponse.json(borrowings);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("equipment:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const borrowing = await prisma.equipmentBorrowing.create({
    data: {
      equipment_id: body.equipment_id,
      resident_id: body.resident_id || null,
      borrower_name: body.borrower_name,
      date_borrowed: new Date(body.date_borrowed),
      expected_return: new Date(body.expected_return),
      recorded_by: parseInt(auth.session.user.id),
    },
    include: { equipment: true, resident: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "EquipmentBorrowing",
    record_id: borrowing.id,
    details: `${body.borrower_name} borrowed: ${borrowing.equipment.name}`,
  });

  return NextResponse.json(borrowing, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission("equipment:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const borrowing = await prisma.equipmentBorrowing.update({
    where: { id: body.id },
    data: {
      actual_return: new Date(),
      return_condition: body.return_condition,
      is_overdue: false,
    },
    include: { equipment: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "EquipmentBorrowing",
    record_id: borrowing.id,
    details: `Returned equipment: ${borrowing.equipment.name}`,
  });

  return NextResponse.json(borrowing);
}