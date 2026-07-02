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

export const MOCK_FINANCIAL_RECORDS: FinancialRecordMock[] = [
  {
    id: 1,
    transaction_type: "INCOME",
    amount: 15000,
    description: "IRA Allotment — Q2 2026 release",
    transaction_date: "2026-06-28",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-06-28T09:00:00Z",
  },
  {
    id: 2,
    transaction_type: "EXPENSE",
    amount: 3200,
    description: "Honoraria — Barangay Tanod (June 2026)",
    transaction_date: "2026-06-27",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-06-27T14:30:00Z",
  },
  {
    id: 3,
    transaction_type: "INCOME",
    amount: 850,
    description: "Barangay clearance fees (weekly collection)",
    transaction_date: "2026-06-26",
    recorded_by: 3,
    recorder: MOCK_RECORDER,
    created_at: "2026-06-26T16:10:00Z",
  },
  {
    id: 4,
    transaction_type: "EXPENSE",
    amount: 1450,
    description: "Office supplies — bond paper, ink, folders",
    transaction_date: "2026-06-24",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-06-24T10:15:00Z",
  },
  {
    id: 5,
    transaction_type: "EXPENSE",
    amount: 5200,
    description: "Electricity bill — Barangay Hall (May billing)",
    transaction_date: "2026-06-20",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-06-20T08:45:00Z",
  },
  {
    id: 6,
    transaction_type: "INCOME",
    amount: 2400,
    description: "Business permit endorsement fees",
    transaction_date: "2026-06-18",
    recorded_by: 3,
    recorder: MOCK_RECORDER,
    created_at: "2026-06-18T13:00:00Z",
  },
  {
    id: 7,
    transaction_type: "EXPENSE",
    amount: 8000,
    description: "Relief assistance — flood-affected households (Purok IV)",
    transaction_date: "2026-06-12",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-06-12T11:20:00Z",
  },
  {
    id: 8,
    transaction_type: "INCOME",
    amount: 600,
    description: "Market stall rental collection",
    transaction_date: "2026-06-10",
    recorded_by: 3,
    recorder: MOCK_RECORDER,
    created_at: "2026-06-10T09:30:00Z",
  },
  {
    id: 9,
    transaction_type: "EXPENSE",
    amount: 12500,
    description: "Purchase of plastic chairs and tables for assembly hall",
    transaction_date: "2026-05-28",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-05-28T15:00:00Z",
  },
  {
    id: 10,
    transaction_type: "INCOME",
    amount: 45000,
    description: "IRA Allotment — Q1 2026 release",
    transaction_date: "2026-03-15",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: 11,
    transaction_type: "EXPENSE",
    amount: 6800,
    description: "Barangay Assembly — venue and catering",
    transaction_date: "2026-03-05",
    recorded_by: 4,
    recorder: MOCK_TREASURER,
    created_at: "2026-03-05T14:00:00Z",
  },
  {
    id: 12,
    transaction_type: "INCOME",
    amount: 1200,
    description: "Certificate & document processing fees",
    transaction_date: "2026-02-14",
    recorded_by: 3,
    recorder: MOCK_RECORDER,
    created_at: "2026-02-14T10:00:00Z",
  },
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