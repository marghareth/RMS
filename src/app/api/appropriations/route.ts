// FILE: src/app/api/appropriations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { appropriationCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("appropriations:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const fund_source_id = searchParams.get("fund_source_id");
  const search = searchParams.get("search") || "";

  const where: any = {
    AND: [
      category ? { category } : {},
      status ? { status } : {},
      fund_source_id ? { fund_source_id: parseInt(fund_source_id) } : {},
      search ? { item_name: { contains: search, mode: "insensitive" } } : {},
    ],
  };

  const appropriations = await prisma.appropriation.findMany({
    where,
    include: { fund_source: { select: { id: true, name: true } } },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(appropriations);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("appropriations:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = appropriationCreateSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);

  const appropriation = await prisma.appropriation.create({
    data: {
      item_name: body.item_name,
      category: body.category,
      appropriated_amount: body.appropriated_amount ?? 0,
      obligated_amount: body.obligated_amount ?? 0,
      disbursed_amount: body.disbursed_amount ?? 0,
      payee: body.payee ?? null,
      status: body.status ?? "PENDING",
      fund_source_id: body.fund_source_id ?? null,
      recorded_by: userId,
    },
    include: { fund_source: { select: { id: true, name: true } } },
  });

  await logAudit({
    user_id: userId,
    action: "CREATE",
    table_affected: "Appropriation",
    record_id: appropriation.id,
    details: `Added appropriation: ${appropriation.item_name} (${appropriation.category})`,
  });

  return NextResponse.json(appropriation, { status: 201 });
});