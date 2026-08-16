"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Download, TrendingUp, TrendingDown, Scale } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useReportData } from "@/lib/hooks/useReportData";
import StatCard from "@/components/shared/StatCard";

interface CategoryAmount {
  category: string;
  amount: number;
}

interface FinancialTransaction {
  id: number;
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: number;
  date: string;
  recorder: string;
}

interface FinancialReportData {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  byMonth: { month: string; income: number; expense: number }[];
  incomeByCategory: CategoryAmount[];
  expenseByCategory: CategoryAmount[];
  recent: FinancialTransaction[];
}

const INCOME_COLORS  = ["#0B6E4F","#3E5C76","#0E7490","#6D4AFF","#9CA3AF"];
const EXPENSE_COLORS = ["#B3261E","#B45309","#6D4AFF","#3E5C76","#0E7490","#9CA3AF"];

function fmt(n: number) { return `₱${n.toLocaleString()}`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white mb-4">{title}</p>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#171717] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 shadow-lg text-[11px] space-y-1">
      <p className="font-bold text-[#1B2430] dark:text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
}

export default function FinancialReportPage() {
  const router = useRouter();
  const [year,  setYear]  = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("");

  const { data, loading } = useReportData<FinancialReportData>("financial", { year, month });

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition">
              <ArrowLeft size={18} className="text-[#6B7280] dark:text-[#A3A3A3]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4F5F7] dark:bg-[#262626] flex items-center justify-center">
                <Wallet size={18} className="text-[#6D4AFF] dark:text-[#A78BFA]" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-[#1B2430] dark:text-white uppercase tracking-wide">Financial Report</h1>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Income and expense summary by period</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(e.target.value)}
              className="text-[12px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] bg-white dark:bg-[#171717] text-[#1F2937] dark:text-white">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="text-[12px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] bg-white dark:bg-[#171717] text-[#1F2937] dark:text-white">
              <option value="">All Months</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] transition print:hidden"
            >
              <Download size={13} /> Export PDF
            </button>
          </div>
        </div>
        <div className="mt-4 h-px bg-[#1B2430] dark:bg-[#E5E7EB]" />
        <div className="mt-0.75 h-px bg-[#E9EAEC] dark:bg-[#262626]" />
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <StatCard label="Total Income"  value={fmt(data.totalIncome)}  icon={TrendingUp}   color="green" />
            <StatCard label="Total Expense" value={fmt(data.totalExpense)} icon={TrendingDown} color="red" />
            <StatCard label="Net Balance"   value={fmt(data.netBalance)}   icon={Scale}         color="blue" />
          </div>

          <ChartCard title="Monthly Income vs. Expense" className="mb-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byMonth} barSize={16} barGap={4}>
                <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income"  name="Income"  fill="#0B6E4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#B3261E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0B6E4F] dark:bg-[#34A37A]" /><span className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">Income</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] dark:bg-[#F87171]" /><span className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">Expense</span></div>
            </div>
          </ChartCard>

          <div className="grid grid-cols-2 gap-5 mb-5">

            <ChartCard title="Income by Category">
              <div className="space-y-3">
                {data.incomeByCategory.map((c, i) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[#374151] dark:text-[#D4D4D4]">{c.category}</span>
                      <span className="text-[12px] font-bold tabular-nums text-[#1B2430] dark:text-white">{fmt(c.amount)}</span>
                    </div>
                    <div className="h-2 bg-[#F4F5F7] dark:bg-[#262626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${data.totalIncome ? (c.amount / data.totalIncome) * 100 : 0}%`, background: INCOME_COLORS[i % INCOME_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Expense by Category">
              <div className="space-y-3">
                {data.expenseByCategory.map((c, i) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[#374151] dark:text-[#D4D4D4]">{c.category}</span>
                      <span className="text-[12px] font-bold tabular-nums text-[#1B2430] dark:text-white">{fmt(c.amount)}</span>
                    </div>
                    <div className="h-2 bg-[#F4F5F7] dark:bg-[#262626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${data.totalExpense ? (c.amount / data.totalExpense) * 100 : 0}%`, background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Recent Transactions</p>
            </div>
            <div className="grid grid-cols-[0.7fr_2.5fr_1.2fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] dark:bg-[#262626] border-b border-[#E9EAEC] dark:border-[#262626]">
              {["Type", "Description", "Amount", "Date", "Recorded By"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {data.recent.map((r, i) => (
              <div key={r.id} className={`grid grid-cols-[0.7fr_2.5fr_1.2fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] dark:border-[#262626] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA] dark:bg-[#171717]" : ""}`}>
                <span className={`inline-flex text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide
                  ${r.type === "INCOME" ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400"}`}>
                  {r.type}
                </span>
                <span className="text-[12px] text-[#1B2430] dark:text-white">{r.description}</span>
                <span className={`text-[13px] font-bold tabular-nums ${r.type === "INCOME" ? "text-[#0B6E4F] dark:text-[#34A37A]" : "text-[#B3261E] dark:text-[#F87171]"}`}>
                  {r.type === "INCOME" ? "+" : "-"}{fmt(r.amount)}
                </span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{fmtDate(r.date)}</span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{r.recorder}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}