import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("financial:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const transaction_type = searchParams.get("transaction_type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
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
      include: {
        recorder: { select: { id: true, username: true } },
      },
      orderBy: { transaction_date: "desc" },
    }),
    prisma.financialRecord.count({ where }),
    prisma.financialRecord.groupBy({
      by: ["transaction_type"],
      _sum: { amount: true },
      where,
    }),
  ]);

  const income = summary.find((s: { transaction_type: string; _sum: { amount: any } }) => s.transaction_type === "INCOME")?._sum.amount || 0;
const expense = summary.find((s: { transaction_type: string; _sum: { amount: any } }) => s.transaction_type === "EXPENSE")?._sum.amount || 0;
  return NextResponse.json({ records, total, page, limit, income, expense });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("financial:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const record = await prisma.financialRecord.create({
    data: {
      transaction_type: body.transaction_type,
      amount: body.amount,
      description: body.description,
      transaction_date: new Date(body.transaction_date),
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

  return NextResponse.json(record, { status: 201 });
}