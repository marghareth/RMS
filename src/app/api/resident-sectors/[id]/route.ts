// FILE: src/app/api/resident-sectors/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const sector = await prisma.residentSector.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "ResidentSector",
    record_id: id,
    details: `Removed sector tag: ${sector.sector_type}`,
  });

  return NextResponse.json({ message: "Sector affiliation removed" });
});