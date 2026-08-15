// FILE: src/lib/finance.ts
// Shared formatting helpers and label maps for the Finance Suite pages
// (Budget Overview, Appropriations, Revenue Tracking, Fund Sources,
// Disbursements) — kept in one place so ₱-formatting and category/status
// labels stay consistent across all five.

export function fmtCurrency(value: number | string | null | undefined) {
  const n = value === null || value === undefined ? 0 : Number(value);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function fmtCompactCurrency(value: number | string | null | undefined) {
  const n = value === null || value === undefined ? 0 : Number(value);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? n : 0);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type AppropriationCategory = "PS" | "MOOE" | "CO";

export const APPROPRIATION_CATEGORY_LABELS: Record<AppropriationCategory, string> = {
  PS: "Personnel Services",
  MOOE: "Maintenance & Other Operating Expenses",
  CO: "Capital Outlay",
};

// Same "civic ledger" hues as StatCard's colorMap (src/components/shared/
// StatCard.tsx) — kept here as the single source of truth for category
// colors so anywhere that renders a PS/MOOE/CO badge or chart segment
// (this page, disbursements, revenues, appropriations) reads consistently.
export const APPROPRIATION_CATEGORY_COLORS: Record<AppropriationCategory, string> = {
  PS: "#3E5C76",   // slate blue  — StatCard "blue"
  MOOE: "#B45309", // amber       — StatCard "amber"
  CO: "#0B6E4F",   // seal green  — StatCard "green"
};

export type AppropriationStatus = "PENDING" | "APPROVED" | "COMPLETED";
export type FundSourceStatus = "ACTIVE" | "INACTIVE";

export interface FundSourceMini {
  id: number;
  name: string;
}

export interface FundSourceRecord extends FundSourceMini {
  code: string | null;
  statutory_rule: string | null;
  status: FundSourceStatus;
  original_balance: number | string | null;
  current_balance: number | string;
  created_at: string;
  updated_at: string;
}

export interface AppropriationRecord {
  id: number;
  item_name: string;
  category: AppropriationCategory;
  appropriated_amount: number | string;
  obligated_amount: number | string;
  disbursed_amount: number | string;
  payee: string | null;
  status: AppropriationStatus;
  fund_source_id: number | null;
  fund_source: FundSourceMini | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueRecord {
  id: number;
  amount: number | string;
  date: string;
  source: string;
  category: string | null;
  income_account: string | null;
  coa_code: string | null;
  fund_source_id: number | null;
  fund_source: FundSourceMini | null;
  or_number: string | null;
  created_at: string;
}

export interface DisbursementRecord {
  id: number;
  amount: number | string;
  date: string;
  payee: string;
  particular: string | null;
  check_number: string | null;
  or_number: string | null;
  appropriation_id: number | null;
  appropriation: { id: number; item_name: string; category: AppropriationCategory } | null;
  item: string | null;
  fund_source_id: number | null;
  fund_source: FundSourceMini | null;
  created_at: string;
}

// Groups revenues/disbursements by calendar month (YYYY-MM) for the trend
// charts on Budget Overview — shared so all three trend charts read the
// months in the same order.
export function lastNMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    out.push({ key, label });
  }
  return out;
}