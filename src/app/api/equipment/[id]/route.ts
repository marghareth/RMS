import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("equipment:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const equipment = await prisma.equipment.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      borrowings: {
        include: {
          resident: true,
          recorder: { select: { id: true, username: true } },
        },
        orderBy: { date_borrowed: "desc" },
      },
    },
  });

  if (!equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(equipment);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("equipment:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = parseInt(params.id);

  const equipment = await prisma.equipment.update({
    where: { id },
    data: {
      name: body.name,
      quantity: body.quantity,
      condition: body.condition,
      status: body.status,
      date_acquired: body.date_acquired ? new Date(body.date_acquired) : undefined,
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
}