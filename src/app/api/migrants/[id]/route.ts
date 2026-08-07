// FILE: src/app/api/migrants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { migrantUpdateSchema } from "@/lib/validations";

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = migrantUpdateSchema.parse(await req.json());

  const migrant = await prisma.migrant.update({
    where: { id },
    data: {
      name: body.name,
      previous_location: "previous_location" in body ? body.previous_location ?? null : undefined,
      reason: "reason" in body ? body.reason ?? null : undefined,
      transferred_to: "transferred_to" in body ? body.transferred_to ?? null : undefined,
      duration_here: "duration_here" in body ? body.duration_here ?? null : undefined,
      has_returned: body.has_returned,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Migrant",
    record_id: id,
    details: `Updated migrant record "${migrant.name}"`,
  });

  return NextResponse.json(migrant);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("households:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const migrant = await prisma.migrant.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "Migrant",
    record_id: id,
    details: `Deleted migrant record "${migrant.name}"`,
  });

  return NextResponse.json({ message: "Migrant record deleted" });
});