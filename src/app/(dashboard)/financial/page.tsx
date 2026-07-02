"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  SlidersHorizontal,
  Plus,
  X,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { MOCK_FINANCIAL_RECORDS, FinancialRecordMock, formatCurrency, formatISODate } from "@/lib/mock/financial";

interface FilterState {
  transaction_type: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { transaction_type: "", date_from: "", date_to: "" };

export default function FinancialListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [records] = useState<FinancialRecordMock[]>(MOCK_FINANCIAL_RECORDS);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [records, setRecords] = useState<FinancialRecordMock[]>([]);
  // const [income, setIncome] = useState(0);
  // const [expense, setExpense] = useState(0);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadRecords() {
  //     setLoading(true);
  //     try {
  //       const params = new URLSearchParams({ limit: "50" });
  //       if (filters.transaction_type) params.set("transaction_type", filters.transaction_type);
  //       if (filters.date_from) params.set("date_from", filters.date_from);
  //       if (filters.date_to) params.set("date_to", filters.date_to);
  //
  //       const res = await fetch(`/api/financial?${params}`);
  //       const data = await res.json();
  //       setRecords(data.records ?? []);
  //       setIncome(data.income ?? 0);   // API returns grouped sums directly
  //       setExpense(data.expense ?? 0);
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadRecords();
  // }, [filters]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filters.transaction_type && r.transaction_type !== filters.transaction_type) return false;
      if (filters.date_from && r.transaction_date < filters.date_from) return false;
      if (filters.date_to && r.transaction_date > filters.date_to) return false;
      if (search.trim() && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [records, search, filters]);

  // In the real API this comes pre-aggregated from the `income`/`expense`
  // fields of the GET response (via prisma.financialRecord.groupBy). Here we
  // derive the same numbers client-side from the mock records.
  const { income, expense } = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        if (r.transaction_type === "INCOME") acc.income += r.amount;
        else acc.expense += r.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filtered]);
  const balance = income - expense;

  const activeFilterCount = (filters.transaction_type ? 1 : 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Financial Records"
        subtitle="Track barangay income and expenses"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/financial/summary")}
              className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
            >
              <BarChart3 size={15} />
              View Summary
            </button>
            <button
              onClick={() => router.push("/financial/new")}
              className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
            >
              <Plus size={15} />
              Add Transaction
            </button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Income" value={formatCurrency(income)} sub="Filtered period" icon={TrendingUp} color="green" />
        <StatCard label="Total Expense" value={formatCurrency(expense)} sub="Filtered period" icon={TrendingDown} color="red" />
        <StatCard
          label="Net Balance"
          value={formatCurrency(balance)}
          sub={balance >= 0 ? "Surplus" : "Deficit"}
          icon={Wallet}
          color={balance >= 0 ? "blue" : "amber"}
        />
      </div>

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transaction description"
            className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-[#3B82F6] text-white" : "border border-[#E9EAEC] bg-white text-[#6B7280] hover:bg-[#F4F5F7]"
          }`}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilter && (
          <div className="absolute right-0 top-full z-20 mt-2 w-72 space-y-3 rounded-xl border border-[#E9EAEC] bg-white p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937]">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Transaction Type
              </label>
              <select
                value={filters.transaction_type}
                onChange={(e) => setFilters((f) => ({ ...f, transaction_type: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
              >
                <option value="">All</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] py-2 text-[12px] text-[#6B7280] transition hover:bg-[#F4F5F7]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 rounded-lg bg-[#3B82F6] py-2 text-[12px] font-semibold text-white transition hover:bg-[#2563EB]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No transactions found"
            description="Try adjusting your search or filters, or add a new transaction."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Description</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Type</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]">
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280]">{formatISODate(r.transaction_date)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{r.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        r.transaction_type === "INCOME" ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#FEE2E2] text-[#DC2626]"
                      }`}
                    >
                      {r.transaction_type === "INCOME" ? <ArrowUpCircle size={11} /> : <ArrowDownCircle size={11} />}
                      {r.transaction_type === "INCOME" ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-[13px] font-bold ${
                      r.transaction_type === "INCOME" ? "text-[#059669]" : "text-[#DC2626]"
                    }`}
                  >
                    {r.transaction_type === "INCOME" ? "+" : "−"}
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#9CA3AF]">{r.recorder.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}