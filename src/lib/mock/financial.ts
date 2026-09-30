// FILE: src/lib/mock/financial.ts
// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Financial UI is being built. Shapes mirror the `FinancialRecord` model in
// prisma/schema.prisma and the JSON returned by:
//   GET  /api/financial   → { records, total, page, limit, income, expense }
//   POST /api/financial   → FinancialRecord
// Note: there is no /api/financial/[id] route (no GET/PATCH/DELETE by id) —
// records are append-only from the UI's perspective, matching the current API.
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

export type FinancialType = "INCOME" | "EXPENSE";

export interface FinancialRecorderMock {
  id: number;
  username: string;
}

export interface FinancialRecordMock {
  id: number;
  transaction_type: FinancialType;
  amount: number; // Decimal(12,2) in schema, represented as number here
  description: string;
  transaction_date: string; // ISO date
  recorded_by: number;
  recorder: FinancialRecorderMock;
  created_at: string; // ISO datetime
}

const MOCK_RECORDER: FinancialRecorderMock = { id: 3, username: "secretary_dlrosario" };
const MOCK_TREASURER: FinancialRecorderMock = { id: 4, username: "treasurer_amayo" };

export const INCOME_CATEGORIES = [
  "Barangay Clearance Fees",
  "Certificate Fees",
  "Business Permit Fees",
  "Market/Stall Rental",
  "IRA Allotment",
  "Donations",
  "Other Income",
];

export const EXPENSE_CATEGORIES = [
  "Honoraria",
  "Office Supplies",
  "Utilities",
  "Infrastructure/Repairs",
  "Relief Assistance",
  "Equipment Purchase",
  "Events & Assemblies",
  "Other Expense",
];


// ── HELPERS ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(
    amount
  );
}

export function formatISODate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Aggregates records by month (most-recent first) for the summary page's
// income vs. expense bar chart and monthly breakdown table.
export function groupByMonth(records: FinancialRecordMock[]) {
  const map = new Map<string, { key: string; label: string; income: number; expense: number }>();
  for (const r of records) {
    const d = new Date(r.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, { key, label: formatMonthYear(r.transaction_date), income: 0, expense: 0 });
    }
    const bucket = map.get(key)!;
    if (r.transaction_type === "INCOME") bucket.income += r.amount;
    else bucket.expense += r.amount;
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}