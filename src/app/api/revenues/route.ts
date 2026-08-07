// FILE: src/app/api/revenues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { revenueCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("revenues:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const fund_source_id = searchParams.get("fund_source_id");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const search = searchParams.get("search") || "";

  const where: any = {
    AND: [
      fund_source_id ? { fund_source_id: parseInt(fund_source_id) } : {},
      date_from ? { date: { gte: new Date(date_from) } } : {},
      date_to ? { date: { lte: new Date(date_to) } } : {},
      search
        ? {
            OR: [
              { source: { contains: search, mode: "insensitive" } },
              { or_number: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const revenues = await prisma.revenue.findMany({
    where,
    include: { fund_source: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(revenues);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("revenues:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = revenueCreateSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);
  const amount = body.amount ?? 0;

  // Posting a revenue increases the linked fund source's running balance —
  // done in the same transaction as the insert so the two can never drift
  // apart, matching the pattern used for DeceasedRecord + Resident.is_deceased.
  const [revenue] = await prisma.$transaction([
    prisma.revenue.create({
      data: {
        amount,
        date: body.date,
        source: body.source,
        category: body.category ?? null,
        income_account: body.income_account ?? null,
        coa_code: body.coa_code ?? null,
        fund_source_id: body.fund_source_id ?? null,
        or_number: body.or_number ?? null,
        recorded_by: userId,
      },
      include: { fund_source: { select: { id: true, name: true } } },
    }),
    ...(body.fund_source_id
      ? [prisma.fundSource.update({
          where: { id: body.fund_source_id },
          data: { current_balance: { increment: amount } },
        })]
      : []),
  ]);

  await logAudit({
    user_id: userId,
    action: "CREATE",
    table_affected: "Revenue",
    record_id: revenue.id,
    details: `Recorded revenue: ${revenue.source} (₱${amount})`,
  });

  return NextResponse.json(revenue, { status: 201 });
});