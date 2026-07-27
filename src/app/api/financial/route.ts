// FILE: src/app/api/financial/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { financialCreateSchema, paginationSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("financial:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const transaction_type = searchParams.get("transaction_type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      transaction_type ? { transaction_type } : {},
      date_from ? { transaction_date: { gte: new Date(date_from) } } : {},
      date_to ? { transaction_date: { lte: new Date(date_to) } } : {},
    ],
  };

  const [records, total, summary] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      skip,
      take: limit,
      include: { recorder: { select: { id: true, username: true } } },
      orderBy: { transaction_date: "desc" },
    }),
    prisma.financialRecord.count({ where }),
    prisma.financialRecord.groupBy({ by: ["transaction_type"], _sum: { amount: true }, where }),
  ]);

  const income = summary.find((s: { transaction_type: string; _sum: { amount: any } }) => s.transaction_type === "INCOME")?._sum.amount || 0;
  const expense = summary.find((s: { transaction_type: string; _sum: { amount: any } }) => s.transaction_type === "EXPENSE")?._sum.amount || 0;

  // `amount` is a Prisma Decimal — it serializes to a STRING via toJSON()
  // when passed through NextResponse.json(), which silently breaks any
  // frontend numeric math on it (e.g. `acc.income += r.amount` becomes
  // string concatenation, not addition). Convert to plain numbers here so
  // the client always receives real JSON numbers.
  const serializedRecords = records.map((r: typeof records[number]) => ({ ...r, amount: Number(r.amount) }));

  return NextResponse.json({
    records: serializedRecords,
    total,
    page,
    limit,
    income: Number(income),
    expense: Number(expense),
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("financial:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = financialCreateSchema.parse(await req.json());

  const record = await prisma.financialRecord.create({
    data: {
      transaction_type: body.transaction_type,
      amount: body.amount,
      description: body.description,
      transaction_date: body.transaction_date,
      recorded_by: parseInt(auth.session.user.id),
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "FinancialRecord",
    record_id: record.id,
    details: `Added ${body.transaction_type} of ${body.amount}`,
  });

  return NextResponse.json({ ...record, amount: Number(record.amount) }, { status: 201 });
});