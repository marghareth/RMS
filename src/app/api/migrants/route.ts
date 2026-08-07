// FILE: src/app/api/migrants/route.ts
//
// Migrants only ever make sense scoped to a single household, so there's
// no GET-list here — they're fetched as part of GET /api/households/[id]
// (see the `migrants` include there). This route only needs to create.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { migrantCreateSchema } from "@/lib/validations";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Migrants are a sub-resource of Household — there's no separate
  // "migrants:*" permission in the matrix, so this is gated the same way
  // household mutations are.
  const auth = await requirePermission("households:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = migrantCreateSchema.parse(await req.json());

  const household = await prisma.household.findUnique({ where: { id: body.household_id } });
  if (!household) {
    throw new ApiError(404, "NOT_FOUND", "Household not found.");
  }

  const migrant = await prisma.migrant.create({
    data: {
      household_id: body.household_id,
      name: body.name,
      previous_location: body.previous_location ?? null,
      reason: body.reason ?? null,
      transferred_to: body.transferred_to ?? null,
      duration_here: body.duration_here ?? null,
      has_returned: body.has_returned ?? false,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "Migrant",
    record_id: migrant.id,
    details: `Added migrant record "${migrant.name}" to household ${household.household_no}`,
  });

  return NextResponse.json(migrant, { status: 201 });
});