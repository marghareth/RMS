// FILE: src/app/api/resident-sectors/route.ts
//
// Sectoral affiliations only ever make sense scoped to a single resident,
// so there's no GET-list here — they're fetched as part of
// GET /api/residents/[id] (see the `sectors` include there).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { residentSectorCreateSchema } from "@/lib/validations";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // No dedicated "resident-sectors:*" permission exists — this is a
  // sub-resource of Resident, gated the same way resident mutations are.
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = residentSectorCreateSchema.parse(await req.json());

  const resident = await prisma.resident.findUnique({ where: { id: body.resident_id } });
  if (!resident) {
    throw new ApiError(404, "NOT_FOUND", "Resident not found.");
  }

  // The @@unique([resident_id, sector_type]) constraint on ResidentSector
  // already prevents duplicate tags — a repeat POST surfaces as a clean
  // 409 DUPLICATE via withErrorHandling's Prisma P2002 mapping, no manual
  // pre-check needed.
  const sector = await prisma.residentSector.create({
    data: {
      resident_id: body.resident_id,
      sector_type: body.sector_type,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "ResidentSector",
    record_id: sector.id,
    details: `Tagged resident ${resident.fname} ${resident.lname} as ${sector.sector_type}`,
  });

  return NextResponse.json(sector, { status: 201 });
});