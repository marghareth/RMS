"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Printer } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import {
  FinancialRecordMock,
  formatCurrency,
  groupByMonth,
} from "@/lib/mock/financial";

export default function FinancialSummaryPage() {
  const router = useRouter();

  const [year, setYear] = useState(String(new Date().getFullYear()));

  // ── REAL DATA FETCH ───────────────────────────────────────────────────────
  const [records, setRecords] = useState<FinancialRecordMock[]>([]);
  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      const params = new URLSearchParams({
        limit: "500",
        date_from: `${year}-01-01`,
        date_to: `${year}-12-31`,
      });
      const res = await fetch(`/api/financial?${params}`);
      const data = await res.json();
      if (!cancelled) setRecords(data.records ?? []);
    }

    loadRecords();
    return () => { cancelled = true; };
  }, [year]);

  const yearRecords = useMemo(
    () => records.filter((r) => r.transaction_date.startsWith(year)),
    [records, year]
  );

  const monthly = useMemo(() => groupByMonth(yearRecords), [yearRecords]);

  const totals = useMemo(() => {
    const income = yearRecords.filter((r) => r.transaction_type === "INCOME").reduce((s, r) => s + r.amount, 0);
    const expense = yearRecords.filter((r) => r.transaction_type === "EXPENSE").reduce((s, r) => s + r.amount, 0);
    return { income, expense, balance: income - expense };
  }, [yearRecords]);

  const maxMonthAmount = Math.max(1, ...monthly.map((m) => Math.max(m.income, m.expense)));

  const availableYears = useMemo(() => {
    const years = new Set(records.map((r) => r.transaction_date.slice(0, 4)));
    years.add(year); // always keep the selected year selectable, even with 0 records
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [records, year]);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/financial")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
          >
            <ArrowLeft size={14} />
            Back to Financial Records
          </button>
          <h1 className="text-xl font-bold text-[#1F2937]">Financial Summary</h1>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF]">Monthly income vs. expense breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6]"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {/* Real PDF generation (disabled until API/DB is wired up):
              window.open(`/api/pdf/report/financial?year=${year}`, "_blank")
              — hits the not-yet-implemented /api/pdf/report/[type] route. */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7] print:hidden"
          >
            <Printer size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* Year totals */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Income" value={formatCurrency(totals.income)} sub={`Year ${year}`} icon={TrendingUp} color="green" />
        <StatCard label="Total Expense" value={formatCurrency(totals.expense)} sub={`Year ${year}`} icon={TrendingDown} color="red" />
        <StatCard
          label="Net Balance"
          value={formatCurrency(totals.balance)}
          sub={totals.balance >= 0 ? "Surplus" : "Deficit"}
          icon={Wallet}
          color={totals.balance >= 0 ? "blue" : "amber"}
        />
      </div>

      {/* Monthly bar chart */}
      <div className="mb-5 rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Monthly Breakdown</p>
          <div className="flex items-center gap-4 text-[11px] text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#059669]" />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#DC2626]" />
              Expense
            </span>
          </div>
        </div>

        {monthly.length === 0 ? (
          <p className="py-12 text-center text-[12px] text-[#9CA3AF]">No transactions recorded for {year}.</p>
        ) : (
          <div className="space-y-4">
            {monthly.map((m) => (
              <div key={m.key}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#374151]">{m.label}</span>
                  <span className="text-[#9CA3AF]">
                    Net: <span className={m.income - m.expense >= 0 ? "text-[#059669]" : "text-[#DC2626]"}>
                      {formatCurrency(m.income - m.expense)}
                    </span>
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F4F5F7]">
                      <div
                        className="h-full rounded-full bg-[#059669] transition-all"
                        style={{ width: `${(m.income / maxMonthAmount) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-[#059669]">
                      {formatCurrency(m.income)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F4F5F7]">
                      <div
                        className="h-full rounded-full bg-[#DC2626] transition-all"
                        style={{ width: `${(m.expense / maxMonthAmount) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-[#DC2626]">
                      {formatCurrency(m.expense)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Month</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Income</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Expense</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Net</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.key} className="border-b border-[#F4F5F7] last:border-b-0">
                <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2937]">{m.label}</td>
                <td className="px-4 py-3 text-right text-[12px] text-[#059669]">{formatCurrency(m.income)}</td>
                <td className="px-4 py-3 text-right text-[12px] text-[#DC2626]">{formatCurrency(m.expense)}</td>
                <td
                  className={`px-4 py-3 text-right text-[12px] font-bold ${
                    m.income - m.expense >= 0 ? "text-[#059669]" : "text-[#DC2626]"
                  }`}
                >
                  {formatCurrency(m.income - m.expense)}
                </td>
              </tr>
            ))}
            {monthly.length > 0 && (
              <tr className="bg-[#F9FAFB]">
                <td className="px-4 py-3 text-[12px] font-black uppercase text-[#1F2937]">Total</td>
                <td className="px-4 py-3 text-right text-[12px] font-black text-[#059669]">{formatCurrency(totals.income)}</td>
                <td className="px-4 py-3 text-right text-[12px] font-black text-[#DC2626]">{formatCurrency(totals.expense)}</td>
                <td
                  className={`px-4 py-3 text-right text-[12px] font-black ${
                    totals.balance >= 0 ? "text-[#059669]" : "text-[#DC2626]"
                  }`}
                >
                  {formatCurrency(totals.balance)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}