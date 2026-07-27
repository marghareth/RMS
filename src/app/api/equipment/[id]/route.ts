// FILE: src/app/api/equipment/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { equipmentUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("equipment:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const equipment = await prisma.equipment.findUnique({
    where: { id: parseInt(idParam) },
    include: {
      borrowings: {
        include: { resident: true, recorder: { select: { id: true, username: true } } },
        orderBy: { date_borrowed: "desc" },
      },
    },
  });

  if (!equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(equipment);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("equipment:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = equipmentUpdateSchema.parse(await req.json());

  const equipment = await prisma.equipment.update({
    where: { id },
    data: {
      name: body.name,
      quantity: body.quantity,
      condition: "condition" in body ? body.condition ?? null : undefined,
      status: body.status,
      date_acquired: "date_acquired" in body ? body.date_acquired ?? null : undefined,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Equipment",
    record_id: id,
    details: `Updated equipment: ${equipment.name}`,
  });

  return NextResponse.json(equipment);
});