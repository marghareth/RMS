import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("registries:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const registry_type = searchParams.get("registry_type");
  const purok_id = searchParams.get("purok_id");

  const where: any = {
    AND: [
      registry_type ? { registry_type } : {},
      purok_id ? { resident: { purok_id: parseInt(purok_id) } } : {},
    ],
  };

  const registries = await prisma.specialRegistry.findMany({
    where,
    include: {
      resident: {
        include: {
          purok: true,
          household: { include: { _count: { select: { members: true } } } },
        },
      },
    },
    orderBy: { registered_at: "desc" },
  });

  return NextResponse.json(registries);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("registries:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  // check if already registered
  const existing = await prisma.specialRegistry.findFirst({
    where: {
      resident_id: body.resident_id,
      registry_type: body.registry_type,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already registered in this registry" },
      { status: 409 }
    );
  }

  const registry = await prisma.specialRegistry.create({
    data: {
      resident_id: body.resident_id,
      registry_type: body.registry_type,
      disability_type: body.disability_type || null,
      is_4ps_beneficiary: body.is_4ps_beneficiary || false,
    },
    include: { resident: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "SpecialRegistry",
    record_id: registry.id,
    details: `Added to ${body.registry_type} registry`,
  });

  return NextResponse.json(registry, { status: 201 });
}