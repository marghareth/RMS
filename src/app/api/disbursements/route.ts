// FILE: src/app/api/disbursements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { disbursementCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("disbursements:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const fund_source_id = searchParams.get("fund_source_id");
  const appropriation_id = searchParams.get("appropriation_id");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const search = searchParams.get("search") || "";

  const where: any = {
    AND: [
      fund_source_id ? { fund_source_id: parseInt(fund_source_id) } : {},
      appropriation_id ? { appropriation_id: parseInt(appropriation_id) } : {},
      date_from ? { date: { gte: new Date(date_from) } } : {},
      date_to ? { date: { lte: new Date(date_to) } } : {},
      search
        ? {
            OR: [
              { payee: { contains: search, mode: "insensitive" } },
              { or_number: { contains: search, mode: "insensitive" } },
              { check_number: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const disbursements = await prisma.disbursement.findMany({
    where,
    include: {
      fund_source: { select: { id: true, name: true } },
      appropriation: { select: { id: true, item_name: true, category: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(disbursements);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("disbursements:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = disbursementCreateSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);
  const amount = body.amount ?? 0;

  // A disbursement decreases its fund source's running balance and
  // increases its appropriation's disbursed_amount — both posted in the
  // same transaction as the insert so the Budget Overview's PS/MOOE/CO
  // progress bars and the Fund Sources ledger never drift from reality.
  const ops: any[] = [
    prisma.disbursement.create({
      data: {
        amount,
        date: body.date,
        payee: body.payee,
        particular: body.particular ?? null,
        check_number: body.check_number ?? null,
        or_number: body.or_number ?? null,
        appropriation_id: body.appropriation_id ?? null,
        item: body.item ?? null,
        fund_source_id: body.fund_source_id ?? null,
        recorded_by: userId,
      },
      include: {
        fund_source: { select: { id: true, name: true } },
        appropriation: { select: { id: true, item_name: true, category: true } },
      },
    }),
  ];
  if (body.fund_source_id) {
    ops.push(prisma.fundSource.update({
      where: { id: body.fund_source_id },
      data: { current_balance: { decrement: amount } },
    }));
  }
  if (body.appropriation_id) {
    ops.push(prisma.appropriation.update({
      where: { id: body.appropriation_id },
      data: { disbursed_amount: { increment: amount } },
    }));
  }

  const [disbursement] = await prisma.$transaction(ops);

  await logAudit({
    user_id: userId,
    action: "CREATE",
    table_affected: "Disbursement",
    record_id: disbursement.id,
    details: `Recorded disbursement: ${disbursement.payee} (₱${amount})`,
  });

  return NextResponse.json(disbursement, { status: 201 });
});