// FILE: src/app/api/equipment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { equipmentCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("equipment:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  const where: any = {
    AND: [
      status ? { status } : {},
      search ? { name: { contains: search, mode: "insensitive" } } : {},
    ],
  };

  const equipment = await prisma.equipment.findMany({
    where,
    include: {
      borrowings: { where: { actual_return: null }, include: { resident: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(equipment);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("equipment:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = equipmentCreateSchema.parse(await req.json());

  const equipment = await prisma.equipment.create({
    data: {
      name: body.name,
      quantity: body.quantity ?? 1,
      condition: body.condition ?? null,
      status: body.status ?? "SERVICEABLE",
      date_acquired: body.date_acquired ?? null,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "Equipment",
    record_id: equipment.id,
    details: `Added equipment: ${equipment.name}`,
  });

  return NextResponse.json(equipment, { status: 201 });
});