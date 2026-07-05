"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Download, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  totalIncome:  487500,
  totalExpense: 312800,
  netBalance:   174700,
  byMonth: [
    { month: "Jan", income: 75000,  expense: 48000 },
    { month: "Feb", income: 82000,  expense: 55000 },
    { month: "Mar", income: 68000,  expense: 42000 },
    { month: "Apr", income: 91000,  expense: 61000 },
    { month: "May", income: 46500,  expense: 38000 },
    { month: "Jun", income: 125000, expense: 68800 },
  ],
  incomeByCategory: [
    { category: "Tax Collection",    amount: 210000 },
    { category: "Business Permits",  amount: 98500  },
    { category: "Clearance Fees",    amount: 54000  },
    { category: "Market Fees",       amount: 87000  },
    { category: "Other Income",      amount: 38000  },
  ],
  expenseByCategory: [
    { category: "Personnel Services", amount: 145000 },
    { category: "Office Supplies",    amount: 28000  },
    { category: "Maintenance",        amount: 47000  },
    { category: "Events & Programs",  amount: 62000  },
    { category: "Utilities",          amount: 18000  },
    { category: "Other Expenses",     amount: 12800  },
  ],
  recent: [
    { id: 1,  type: "INCOME",  description: "Tax collection – June 2026",     amount: 125000, date: "2026-06-30", recorder: "treasurer1" },
    { id: 2,  type: "EXPENSE", description: "Office supplies – June 2026",    amount: 8500,   date: "2026-06-28", recorder: "treasurer1" },
    { id: 3,  type: "INCOME",  description: "Business permit – Sari-sari",    amount: 1500,   date: "2026-06-26", recorder: "encoder1"   },
    { id: 4,  type: "EXPENSE", description: "Barangay assembly program",       amount: 15000,  date: "2026-06-25", recorder: "treasurer1" },
    { id: 5,  type: "INCOME",  description: "Clearance fees – June 2026",      amount: 9000,   date: "2026-06-24", recorder: "encoder1"   },
    { id: 6,  type: "EXPENSE", description: "Maintenance – covered court",     amount: 12000,  date: "2026-06-22", recorder: "treasurer1" },
    { id: 7,  type: "INCOME",  description: "Market fees – June 2026",         amount: 14500,  date: "2026-06-20", recorder: "treasurer1" },
    { id: 8,  type: "EXPENSE", description: "Electric bill – June 2026",       amount: 6800,   date: "2026-06-18", recorder: "encoder1"   },
  ],
};

const INCOME_COLORS  = ["#3B82F6","#0EA5E9","#06B6D4","#10B981","#6366F1"];
const EXPENSE_COLORS = ["#EF4444","#F97316","#F59E0B","#EC4899","#8B5CF6","#6B7280"];

function fmt(n: number) { return `₱${n.toLocaleString()}`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E9EAEC] p-5 ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-4">{title}</p>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg text-[11px] space-y-1">
      <p className="font-bold text-[#1F2937]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FinancialReportPage() {
  const router = useRouter();
  const [year,  setYear]  = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("");

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [data, setData] = useState<typeof MOCK | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams({ type: "financial" });
    if (year)  params.set("year", year);
    if (month) params.set("month", month);
    fetch(`/api/reports?${params}`)
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [year, month]);
  ─────────────────────────────────────────────────────────────────────────── */

  const data = MOCK;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Wallet size={18} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">Financial Report</h1>
              <p className="text-[11px] text-[#9CA3AF]">Income and expense summary by period</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            <option value="">All Months</option>
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Summary banner ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-green-500 rounded-xl px-5 py-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="opacity-80" />
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Total Income</p>
          </div>
          <p className="text-[28px] font-black leading-none">{fmt(data.totalIncome)}</p>
        </div>
        <div className="bg-red-500 rounded-xl px-5 py-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="opacity-80" />
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Total Expense</p>
          </div>
          <p className="text-[28px] font-black leading-none">{fmt(data.totalExpense)}</p>
        </div>
        <div className="bg-[#3B82F6] rounded-xl px-5 py-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="opacity-80" />
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Net Balance</p>
          </div>
          <p className="text-[28px] font-black leading-none">{fmt(data.netBalance)}</p>
        </div>
      </div>

      {/* ── Monthly overview chart ── */}
      <ChartCard title="Monthly Income vs. Expense" className="mb-5">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.byMonth} barSize={16} barGap={4}>
            <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income"  name="Income"  fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /><span className="text-[10px] text-[#9CA3AF]">Income</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /><span className="text-[10px] text-[#9CA3AF]">Expense</span></div>
        </div>
      </ChartCard>

      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* Income by category */}
        <ChartCard title="Income by Category">
          <div className="space-y-3">
            {data.incomeByCategory.map((c, i) => (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[#374151]">{c.category}</span>
                  <span className="text-[12px] font-bold text-[#1F2937]">{fmt(c.amount)}</span>
                </div>
                <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.amount / data.totalIncome) * 100}%`, background: INCOME_COLORS[i % INCOME_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Expense by category */}
        <ChartCard title="Expense by Category">
          <div className="space-y-3">
            {data.expenseByCategory.map((c, i) => (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[#374151]">{c.category}</span>
                  <span className="text-[12px] font-bold text-[#1F2937]">{fmt(c.amount)}</span>
                </div>
                <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.amount / data.totalExpense) * 100}%`, background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Recent Transactions</p>
        </div>
        <div className="grid grid-cols-[0.7fr_2.5fr_1.2fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
          {["Type", "Description", "Amount", "Date", "Recorded By"].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {data.recent.map((r, i) => (
          <div key={r.id} className={`grid grid-cols-[0.7fr_2.5fr_1.2fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
            <span className={`inline-flex text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide
              ${r.type === "INCOME" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {r.type}
            </span>
            <span className="text-[12px] text-[#1F2937]">{r.description}</span>
            <span className={`text-[13px] font-bold ${r.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
              {r.type === "INCOME" ? "+" : "-"}{fmt(r.amount)}
            </span>
            <span className="text-[11px] text-[#9CA3AF]">{fmtDate(r.date)}</span>
            <span className="text-[11px] text-[#9CA3AF]">{r.recorder}</span>
          </div>
        ))}
      </div>
    </div>
  );
}