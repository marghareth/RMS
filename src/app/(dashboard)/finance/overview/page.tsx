// FILE: src/app/(dashboard)/finance/overview/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Landmark, ClipboardList,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import StatCard from "@/components/shared/StatCard";
import {
  fmtCurrency, fmtCompactCurrency, lastNMonths,
  APPROPRIATION_CATEGORY_LABELS, APPROPRIATION_CATEGORY_COLORS,
  AppropriationRecord, RevenueRecord, DisbursementRecord, FundSourceRecord,
} from "@/lib/finance";

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
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtCurrency(p.value)}</p>
      ))}
    </div>
  );
}

export default function BudgetOverviewPage() {
  const [fundSources, setFundSources] = useState<FundSourceRecord[]>([]);
  const [appropriations, setAppropriations] = useState<AppropriationRecord[]>([]);
  const [revenues, setRevenues] = useState<RevenueRecord[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/fund-sources").then((r) => r.json()),
      fetch("/api/appropriations").then((r) => r.json()),
      fetch("/api/revenues").then((r) => r.json()),
      fetch("/api/disbursements").then((r) => r.json()),
    ])
      .then(([fs, ap, rv, db]) => {
        if (cancelled) return;
        setFundSources(fs ?? []);
        setAppropriations(ap ?? []);
        setRevenues(rv ?? []);
        setDisbursements(db ?? []);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const appropriated = appropriations.reduce((s, a) => s + Number(a.appropriated_amount), 0);
    const obligated = appropriations.reduce((s, a) => s + Number(a.obligated_amount), 0);
    const disbursed = appropriations.reduce((s, a) => s + Number(a.disbursed_amount), 0);
    const revenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
    const balance = fundSources.reduce((s, f) => s + Number(f.current_balance), 0);
    return { appropriated, obligated, disbursed, revenue, balance };
  }, [appropriations, revenues, fundSources]);

  // PS / MOOE / CO progress — appropriated vs. disbursed per category.
  const byCategory = useMemo(() => {
    return (["PS", "MOOE", "CO"] as const).map((cat) => {
      const items = appropriations.filter((a) => a.category === cat);
      const appropriated = items.reduce((s, a) => s + Number(a.appropriated_amount), 0);
      const disbursed = items.reduce((s, a) => s + Number(a.disbursed_amount), 0);
      const pct = appropriated > 0 ? Math.min(100, (disbursed / appropriated) * 100) : 0;
      return { cat, appropriated, disbursed, pct };
    });
  }, [appropriations]);

  // Trend chart 1: Revenue vs Disbursement per month, last 6 months.
  const months = useMemo(() => lastNMonths(6), []);
  const revenueVsDisbursement = useMemo(() => {
    return months.map(({ key, label }) => {
      const revenue = revenues
        .filter((r) => r.date.slice(0, 7) === key)
        .reduce((s, r) => s + Number(r.amount), 0);
      const disbursed = disbursements
        .filter((d) => d.date.slice(0, 7) === key)
        .reduce((s, d) => s + Number(d.amount), 0);
      return { month: label, Revenue: revenue, Disbursed: disbursed };
    });
  }, [months, revenues, disbursements]);

  // Trend chart 2: cumulative fund balance over the same window, starting
  // from each fund source's original balance and rolling revenue minus
  // disbursement forward month by month.
  const fundBalanceTrend = useMemo(() => {
    const startingBalance = fundSources.reduce((s, f) => s + Number(f.original_balance ?? 0), 0);
    // Built with reduce (accumulator carries the running total) rather than
    // a reassigned `let` across the loop — keeps each step a pure function
    // of its inputs instead of mutating a variable shared across renders.
    const { rows } = months.reduce<{ running: number; rows: { month: string; Balance: number }[] }>(
      (acc, { key, label }) => {
        const monthRevenue = revenues
          .filter((r) => r.date.slice(0, 7) === key)
          .reduce((s, r) => s + Number(r.amount), 0);
        const monthDisbursed = disbursements
          .filter((d) => d.date.slice(0, 7) === key)
          .reduce((s, d) => s + Number(d.amount), 0);
        const running = acc.running + monthRevenue - monthDisbursed;
        return { running, rows: [...acc.rows, { month: label, Balance: running }] };
      },
      { running: startingBalance, rows: [] }
    );
    return rows;
  }, [months, revenues, disbursements, fundSources]);

  // Trend chart 3: appropriation breakdown by category (pie).
  const categoryBreakdown = useMemo(
    () => byCategory
      .filter((c) => c.appropriated > 0)
      .map((c) => ({ name: APPROPRIATION_CATEGORY_LABELS[c.cat], value: c.appropriated, color: APPROPRIATION_CATEGORY_COLORS[c.cat] })),
    [byCategory]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#1F2937]">Budget Overview</h1>
        <p className="mt-0.5 text-[12px] text-[#9CA3AF]">Barangay-wide appropriations, revenue, and disbursement snapshot</p>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Appropriated" value={fmtCompactCurrency(totals.appropriated)} sub="Total budget set" icon={ClipboardList} color="blue" />
        <StatCard label="Obligated" value={fmtCompactCurrency(totals.obligated)} sub="Committed spending" icon={TrendingDown} color="amber" />
        <StatCard label="Disbursed" value={fmtCompactCurrency(totals.disbursed)} sub="Actually paid out" icon={TrendingDown} color="red" />
        <StatCard label="Revenue" value={fmtCompactCurrency(totals.revenue)} sub="All-time collected" icon={TrendingUp} color="green" />
        <StatCard label="Fund Balance" value={fmtCompactCurrency(totals.balance)} sub="Across all fund sources" icon={Wallet} color="blue" />
      </div>

      {/* PS / MOOE / CO progress */}
      <ChartCard title="Appropriation Utilization by Category" className="mb-5">
        <div className="space-y-4">
          {byCategory.map((c) => (
            <div key={c.cat}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="font-semibold text-[#374151]">{APPROPRIATION_CATEGORY_LABELS[c.cat]}</span>
                <span className="text-[#9CA3AF]">
                  {fmtCurrency(c.disbursed)} / {fmtCurrency(c.appropriated)} ({c.pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#F4F5F7]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${c.pct}%`, backgroundColor: APPROPRIATION_CATEGORY_COLORS[c.cat] }}
                />
              </div>
            </div>
          ))}
          {appropriations.length === 0 && (
            <p className="py-6 text-center text-[12px] text-[#9CA3AF]">No appropriations recorded yet.</p>
          )}
        </div>
      </ChartCard>

      {/* 3 trend charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Revenue vs. Disbursement (6 mo.)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueVsDisbursement} barSize={14} barGap={4}>
              <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Disbursed" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fund Balance Trend (6 mo.)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={fundBalanceTrend}>
              <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Balance" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appropriation Breakdown by Category" className="lg:col-span-2">
          {categoryBreakdown.length === 0 ? (
            <p className="py-12 text-center text-[12px] text-[#9CA3AF]">No appropriations recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {categoryBreakdown.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}