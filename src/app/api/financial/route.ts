// FILE: src/app/api/financial/route.ts
//
// GET  /api/financial                      — paged list (+ income/expense totals for the filter)
// GET  /api/financial?view=summary&year=Y  — year totals and per-month totals for the
//                                            Financial Summary page, over ALL records
//                                            (no 100-record page cap), plus the years
//                                            that have data, for its year picker
// POST /api/financial                      — add a record
//
// date_from / date_to (YYYY-MM-DD) are whole days in Philippine time — see
// src/lib/financial-summary.ts for why the old UTC parsing dropped records.
import type { Prisma, FinancialType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { financialCreateSchema, paginationSchema } from "@/lib/validations";
import {
  manilaCurrentYear,
  manilaDayStart,
  manilaNextDayStart,
  manilaYearMonth,
  manilaYearRange,
  summarizeLedger,
} from "@/lib/financial-summary";

/** Year totals + monthly breakdown for one Manila calendar year. */
async function yearSummary(yearParam: string | null) {
  const year = yearParam === null || yearParam === "" ? manilaCurrentYear() : Number(yearParam);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new ApiError(400, "INVALID_YEAR", "year must be a four-digit year, e.g. 2026.");
  }

  const [rows, span] = await Promise.all([
    prisma.financialRecord.findMany({
      where: { transaction_date: manilaYearRange(year) },
      select: { transaction_type: true, amount: true, transaction_date: true },
    }),
    prisma.financialRecord.aggregate({ _min: { transaction_date: true }, _max: { transaction_date: true } }),
  ]);

  // Every year from the oldest record to the newest, plus the requested and
  // current year, so the picker always offers something sensible.
  const years = new Set<number>([year, manilaCurrentYear()]);
  if (span._min.transaction_date && span._max.transaction_date) {
    const first = manilaYearMonth(span._min.transaction_date).year;
    const last = manilaYearMonth(span._max.transaction_date).year;
    for (let y = first; y <= last; y++) years.add(y);
  }

  return { year, ...summarizeLedger(rows), count: rows.length, years: [...years].sort((a, b) => b - a) };
}

/** YYYY-MM-DD → a whole-day bound in Manila; anything else is a 400. */
function dayBound(value: string, which: "from" | "to"): Date {
  const d = which === "from" ? manilaDayStart(value) : manilaNextDayStart(value);
  if (!d) throw new ApiError(400, "INVALID_DATE", `date_${which} must be a date in YYYY-MM-DD form.`);
  return d;
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("financial:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("view") === "summary") {
    return NextResponse.json(await yearSummary(searchParams.get("year")));
  }

  const transaction_type = searchParams.get("transaction_type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: Prisma.FinancialRecordWhereInput = {
    AND: [
      transaction_type ? { transaction_type: transaction_type as FinancialType } : {},
      date_from ? { transaction_date: { gte: dayBound(date_from, "from") } } : {},
      // `lt` the start of the next day, so all of date_to is included.
      date_to ? { transaction_date: { lt: dayBound(date_to, "to") } } : {},
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