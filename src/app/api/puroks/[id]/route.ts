// FILE: src/app/api/puroks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { purokUpdateSchema } from "@/lib/validations";

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("settings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const body = purokUpdateSchema.parse(await req.json());

  const purok = await prisma.purok.update({
    where: { id },
    data: { name: body.name },
  });

  return NextResponse.json(purok);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("settings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  // Puroks are referenced by both residents and households. Rather than let
  // a raw FK-constraint error bubble up, check up front and give a clear,
  // actionable message telling the admin how many records are still linked.
  const [residentCount, householdCount] = await Promise.all([
    prisma.resident.count({ where: { purok_id: id } }),
    prisma.household.count({ where: { purok_id: id } }),
  ]);

  if (residentCount > 0 || householdCount > 0) {
    const parts: string[] = [];
    if (residentCount > 0) parts.push(`${residentCount} resident${residentCount !== 1 ? "s" : ""}`);
    if (householdCount > 0) parts.push(`${householdCount} household${householdCount !== 1 ? "s" : ""}`);
    throw new ApiError(
      409,
      "PUROK_IN_USE",
      `Can't delete this purok — it's still assigned to ${parts.join(" and ")}. Reassign them to another purok first.`
    );
  }

  await prisma.purok.delete({ where: { id } });

  return NextResponse.json({ message: "Purok deleted successfully" });
});