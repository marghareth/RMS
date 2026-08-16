// FILE: src/app/(dashboard)/finance/overview/page.tsx
//
// REDESIGN: visual refresh to match the reports/analytics card language
// (rounded-2xl cards, refined chart styling, chip-style legends, KPI cards
// with trend pills) — no changes to the underlying data/calculations,
// which were already correct; this only changes presentation.
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, ClipboardList,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import StatCard from "@/components/shared/StatCard";
import {
  fmtCurrency, fmtCompactCurrency, lastNMonths,
  APPROPRIATION_CATEGORY_LABELS, APPROPRIATION_CATEGORY_COLORS,
  AppropriationRecord, RevenueRecord, DisbursementRecord, FundSourceRecord,
} from "@/lib/finance";

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-[#1B2430] dark:text-white">{title}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="space-y-1 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[11px] shadow-lg">
      <p className="font-bold text-[#1B2430] dark:text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, ...MONO }}>{p.name}: {fmtCurrency(p.value)}</p>
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

  const byCategory = useMemo(() => {
    return (["PS", "MOOE", "CO"] as const).map((cat) => {
      const items = appropriations.filter((a) => a.category === cat);
      const appropriated = items.reduce((s, a) => s + Number(a.appropriated_amount), 0);
      const disbursed = items.reduce((s, a) => s + Number(a.disbursed_amount), 0);
      const pct = appropriated > 0 ? Math.min(100, (disbursed / appropriated) * 100) : 0;
      return { cat, appropriated, disbursed, pct };
    });
  }, [appropriations]);

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

  const fundBalanceTrend = useMemo(() => {
    const startingBalance = fundSources.reduce((s, f) => s + Number(f.original_balance ?? 0), 0);
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

  const categoryBreakdown = useMemo(
    () => byCategory
      .filter((c) => c.appropriated > 0)
      .map((c) => ({ name: APPROPRIATION_CATEGORY_LABELS[c.cat], value: c.appropriated, color: APPROPRIATION_CATEGORY_COLORS[c.cat] })),
    [byCategory]
  );
  const categoryTotal = categoryBreakdown.reduce((s, c) => s + c.value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3E5C76] dark:border-[#8FB0CC] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-[#1B2430] dark:text-white">Budget Overview</h1>
        <p className="mt-1 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">Barangay-wide appropriations, revenue, and disbursement snapshot</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Appropriated" value={fmtCompactCurrency(totals.appropriated)} sub="Total budget set" icon={ClipboardList} color="blue" />
        <StatCard label="Obligated" value={fmtCompactCurrency(totals.obligated)} sub="Committed spending" icon={TrendingDown} color="amber" />
        <StatCard label="Disbursed" value={fmtCompactCurrency(totals.disbursed)} sub="Actually paid out" icon={TrendingDown} color="red" />
        <StatCard label="Revenue" value={fmtCompactCurrency(totals.revenue)} sub="All-time collected" icon={TrendingUp} color="green" />
        <StatCard label="Fund Balance" value={fmtCompactCurrency(totals.balance)} sub="Across all fund sources" icon={Wallet} color="teal" />
      </div>
      <ChartCard title="Appropriation Utilization by Category" subtitle="Disbursed against appropriated, per category" className="mb-5">
        <div className="space-y-5">
          {byCategory.map((c) => (
            <div key={c.cat}>
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 font-semibold text-[#374151] dark:text-[#D4D4D4]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: APPROPRIATION_CATEGORY_COLORS[c.cat] }} />
                  {APPROPRIATION_CATEGORY_LABELS[c.cat]}
                </span>
                <span className="text-[#9CA3AF] dark:text-[#A3A3A3]" style={MONO}>
                  {fmtCurrency(c.disbursed)} / {fmtCurrency(c.appropriated)} · <span className="font-bold text-[#1B2430] dark:text-white">{c.pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#F4F5F7] dark:bg-[#262626]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${c.pct}%`, backgroundColor: APPROPRIATION_CATEGORY_COLORS[c.cat] }}
                />
              </div>
            </div>
          ))}
          {appropriations.length === 0 && (
            <p className="py-6 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No appropriations recorded yet.</p>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Revenue vs. Disbursement" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueVsDisbursement} barSize={14} barGap={4}>
              <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
              <Bar dataKey="Revenue" fill="#0B6E4F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Disbursed" fill="#B3261E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fund Balance Trend" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={fundBalanceTrend}>
              <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E9EAEC" }} />
              <Line type="monotone" dataKey="Balance" stroke="#3E5C76" strokeWidth={2.5} dot={{ r: 3, fill: "#3E5C76" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appropriation Breakdown" subtitle="Share of total appropriated budget, by category" className="lg:col-span-2">
          {categoryBreakdown.length === 0 ? (
            <p className="py-12 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No appropriations recorded yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
              <ResponsiveContainer width={220} height={220} className="shrink-0">
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3} stroke="none">
                    {categoryBreakdown.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex w-full max-w-xs flex-col gap-3">
                {categoryBreakdown.map((c) => {
                  const pct = categoryTotal > 0 ? (c.value / categoryTotal) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-3 rounded-xl border border-[#F0F1F3] dark:border-[#262626] px-3 py-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#374151] dark:text-[#D4D4D4]">{c.name}</p>
                        <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]" style={MONO}>{fmtCurrency(c.value)}</p>
                      </div>
                      <span className="shrink-0 text-[13px] font-bold text-[#1B2430] dark:text-white" style={MONO}>{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}