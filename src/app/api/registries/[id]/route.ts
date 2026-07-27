// FILE: src/app/api/registries/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { registryUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("registries:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const registry = await prisma.specialRegistry.findUnique({
    where: { id: parseInt(idParam) },
    include: {
      resident: {
        include: {
          purok: true,
          household: { include: { _count: { select: { members: true } } } },
          certificates: { orderBy: { issued_at: "desc" } },
          barangay_ids: { orderBy: { issued_date: "desc" } },
          health_records: { orderBy: { recorded_at: "desc" } },
          vaccinations: { orderBy: { date_given: "desc" } },
        },
      },
    },
  });

  if (!registry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(registry);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("registries:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = registryUpdateSchema.parse(await req.json());

  const registry = await prisma.specialRegistry.update({
    where: { id },
    data: {
      disability_type: body.disability_type,
      is_4ps_beneficiary: body.is_4ps_beneficiary,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "SpecialRegistry",
    record_id: id,
    details: `Updated registry ID: ${id}`,
  });

  return NextResponse.json(registry);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("registries:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  await prisma.specialRegistry.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "SpecialRegistry",
    record_id: id,
    details: `Removed from registry ID: ${id}`,
  });

  return NextResponse.json({ message: "Removed from registry" });
});