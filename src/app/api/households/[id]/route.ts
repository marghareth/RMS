// FILE: src/app/api/households/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { householdUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("households:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const household = await prisma.household.findUnique({
    where: { id: parseInt(idParam) },
    include: {
      purok: true,
      household_head: true,
      members: { where: { is_archived: false }, orderBy: { lname: "asc" } },
    },
  });

  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(household);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  // .partial() means an omitted field is left `undefined` in the parsed
  // result, and Prisma's `update` skips undefined fields — so this can be
  // passed straight through without wiping out fields the caller didn't send.
  const body = householdUpdateSchema.parse(await req.json());

  const household = await prisma.household.update({
    where: { id },
    data: {
      purok_id: body.purok_id,
      household_head_id: "household_head_id" in body ? body.household_head_id ?? null : undefined,
      address: body.address,
      housing_type: "housing_type" in body ? body.housing_type ?? null : undefined,
      water_source: "water_source" in body ? body.water_source ?? null : undefined,
      comfort_room: "comfort_room" in body ? body.comfort_room ?? null : undefined,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Household",
    record_id: id,
    details: `Updated household ${household.household_no}`,
  });

  return NextResponse.json(household);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const household = await prisma.household.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "Household",
    record_id: id,
    details: `Deleted household ${household.household_no}`,
  });

  return NextResponse.json({ message: "Household deleted" });
});