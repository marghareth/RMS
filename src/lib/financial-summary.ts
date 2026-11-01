// FILE: src/lib/financial-summary.ts
//
// Date ranges and monthly totals for the financial ledger, in Philippine time.
//
// WHY THIS EXISTS
//  1. The Financial Summary page asked /api/financial for `limit=500`
//     records, but the API caps `limit` at 100, so every request was rejected
//     and the page showed ₱0.00 for the year even with records on file.
//     The summary is now computed in the API (view=summary) with no record
//     cap, using the helpers below.
//  2. Date filters were parsed as UTC midnight: `date_to=2026-12-31` meant
//     "up to 2026-12-31 00:00 UTC" (8:00 AM in Manila), so almost all of the
//     last day was dropped, and `date_from` skipped the first 8 hours of the
//     first day. Dates are now whole days in Asia/Manila.
//
// Manila is UTC+8 all year (no daylight saving), so a fixed offset is exact.
// Pure module: no Prisma, no I/O.

export const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Start of a calendar day in Manila, for "YYYY-MM-DD". Null if it isn't a real date. */
export function manilaDayStart(date: string): Date | null {
  const m = DATE_ONLY.exec(date.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = Date.UTC(y, mo - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return new Date(utc - MANILA_OFFSET_MS);
}

/** Start of the NEXT day in Manila — use with `lt` so the whole day is included. */
export function manilaNextDayStart(date: string): Date | null {
  const start = manilaDayStart(date);
  return start ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : null;
}

/** [start of Jan 1, start of next Jan 1) in Manila. */
export function manilaYearRange(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 0, 1) - MANILA_OFFSET_MS),
    lt: new Date(Date.UTC(year + 1, 0, 1) - MANILA_OFFSET_MS),
  };
}

/** Year and month (0–11) of an instant, as the calendar reads in Manila. */
export function manilaYearMonth(at: Date): { year: number; month: number } {
  const shifted = new Date(at.getTime() + MANILA_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

/** Today's year in Manila. */
export function manilaCurrentYear(now: Date = new Date()): number {
  return manilaYearMonth(now).year;
}

export interface LedgerRow {
  transaction_type: "INCOME" | "EXPENSE" | string;
  amount: number | string | { toString(): string };
  transaction_date: Date | string;
}

export interface MonthTotal {
  /** "2026-03" */
  key: string;
  /** "March 2026" */
  label: string;
  income: number;
  expense: number;
}

export interface LedgerSummary {
  income: number;
  expense: number;
  balance: number;
  /** Months that have at least one transaction, most recent first. */
  months: MonthTotal[];
}

/** Rounds to centavos so float sums like 0.1 + 0.2 don't show as 0.30000000000000004. */
const centavos = (n: number) => Math.round(n * 100) / 100;

/** Totals for the whole set and per Manila calendar month. */
export function summarizeLedger(rows: LedgerRow[]): LedgerSummary {
  const byMonth = new Map<string, MonthTotal>();
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amount = Number(r.amount);
    if (!Number.isFinite(amount)) continue;
    const { year, month } = manilaYearMonth(new Date(r.transaction_date));
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = { key, label: `${MONTHS[month]} ${year}`, income: 0, expense: 0 };
      byMonth.set(key, bucket);
    }
    if (r.transaction_type === "INCOME") {
      bucket.income += amount;
      income += amount;
    } else if (r.transaction_type === "EXPENSE") {
      bucket.expense += amount;
      expense += amount;
    }
  }
  const months = [...byMonth.values()]
    .map((m) => ({ ...m, income: centavos(m.income), expense: centavos(m.expense) }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
  return { income: centavos(income), expense: centavos(expense), balance: centavos(income - expense), months };
}