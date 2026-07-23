// FILE PATH: src/app/(dashboard)/dashboard/page.tsx
// Replace the entire contents of this file with the code below.
//
// WHAT WAS WRONG: every number on this page was a hardcoded literal —
// "2,847" residents, "612" households, "+12.5%" trends, 3 fake blotter
// cases, 5 fake activity log lines — none of it came from the database.
// /api/dashboard/route.ts already existed and already computed real
// totals, but this page never called it.
//
// FIX: converted to a client component that fetches /api/dashboard on
// mount. Stat card values now come straight from the API. Trend badges
// use real month-over-month percent changes (see api-dashboard-route.ts —
// update that file too, it now returns a `trends` object this page
// reads). "Active Blotter Cases" has no trend badge since a live
// snapshot count doesn't have a natural month-over-month comparison.
// Recent Blotter Cases and Recent Activity are now the actual latest
// rows from the database instead of fixed sample data.

"use client";

import { useEffect, useState } from "react";
import {
  Users, Home, FileText, Shield,
  Package, TrendingUp, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface BlotterCaseRow {
  id: number;
  case_number: string;
  complainant_name: string;
  respondent_name: string;
  status: string;
}

interface ActivityRow {
  id: number;
  action: string;
  table_affected: string;
  details: string | null;
  performed_at: string;
  user: { username: string };
}

interface DashboardData {
  totalResidents:     number;
  totalHouseholds:    number;
  activeCases:        number;
  borrowedEquipment:  number;
  certsThisMonth:     number;
  certsThisYear:      number;
  recentActivity:     ActivityRow[];
  recentBlotterCases: BlotterCaseRow[];
  trends: {
    residents:  number | null;
    households: number | null;
    certsMonth: number | null;
    equipment:  number | null;
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityLabel(a: ActivityRow): string {
  // logAudit() calls across the app already write a readable sentence into
  // `details` (e.g. "Added health record for resident ID: 4"). Fall back
  // to a generic "<ACTION> <table>" only for older/edge-case rows that
  // don't have details.
  return a.details ?? `${a.action} — ${a.table_affected}`;
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-[#EBF3FF] text-[#2563EB]">
        New
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
        ${up ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#FEE2E2] text-[#DC2626]"}`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? "+" : ""}{value}%
    </span>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
interface StatCardDef {
  label: string;
  value: string;
  trend?: number | null;   // undefined = no trend badge at all (e.g. Active Cases)
  sub: string;
  desc: string;
  icon: React.ElementType;
  valueColor: string;
  iconBg: string;
  iconColor: string;
}

function StatCard({ s }: { s: StatCardDef }) {
  const Icon = s.icon;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{s.label}</p>
          <p className={`text-4xl font-bold leading-none ${s.valueColor}`}>{s.value}</p>
        </div>
        {s.trend !== undefined && <TrendBadge value={s.trend} />}
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-[#F4F5F7]">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium text-[#374151]">{s.sub}</p>
          <p className="text-xs text-[#9CA3AF]">{s.desc}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-4 ${s.iconBg}`}>
          <Icon size={18} className={s.iconColor} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => { if (!r.ok) throw new Error("Failed to load dashboard data"); return r.json(); })
      .then((d: DashboardData) => setData(d))
      .catch((e) => setError(e.message || "Something went wrong."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return <div className="py-16 text-center text-[13px] text-[#9CA3AF]">Loading dashboard…</div>;
  }
  if (error || !data) {
    return (
      <div className="py-16 text-center text-[13px] text-red-500">
        {error || "Unable to load dashboard data."}
      </div>
    );
  }

  const stats: StatCardDef[] = [
    {
      label: "Total Residents", value: data.totalResidents.toLocaleString(),
      trend: data.trends.residents, sub: "Active registered residents",
      desc: "Non-archived residents in RBI", icon: Users,
      valueColor: "text-[#2563EB]", iconBg: "bg-[#EBF3FF]", iconColor: "text-[#2563EB]",
    },
    {
      label: "Households", value: data.totalHouseholds.toLocaleString(),
      trend: data.trends.households, sub: "Registered households",
      desc: "Total households on file", icon: Home,
      valueColor: "text-[#059669]", iconBg: "bg-[#D1FAE5]", iconColor: "text-[#059669]",
    },
    {
      label: "Active Blotter Cases", value: data.activeCases.toLocaleString(),
      // No trend: this is a live snapshot count, not a monthly total —
      // there's no meaningful "vs last month" comparison for it.
      sub: "Filed and ongoing cases", desc: "Cases awaiting resolution", icon: Shield,
      valueColor: "text-[#DC2626]", iconBg: "bg-[#FEE2E2]", iconColor: "text-[#DC2626]",
    },
    {
      label: "Certs This Month", value: data.certsThisMonth.toLocaleString(),
      trend: data.trends.certsMonth, sub: "Certificates issued",
      desc: `Issued in ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, icon: FileText,
      valueColor: "text-[#D97706]", iconBg: "bg-[#FEF3C7]", iconColor: "text-[#D97706]",
    },
    {
      label: "Borrowed Equipment", value: data.borrowedEquipment.toLocaleString(),
      trend: data.trends.equipment, sub: "Items currently out",
      desc: "Not yet returned", icon: Package,
      valueColor: "text-[#D97706]", iconBg: "bg-[#FEF3C7]", iconColor: "text-[#D97706]",
    },
    {
      label: "Certs This Year", value: data.certsThisYear.toLocaleString(),
      // No month-over-month trend for a year-to-date total.
      sub: "Total issued this year", desc: `Since Jan 1, ${new Date().getFullYear()}`, icon: TrendingUp,
      valueColor: "text-[#2563EB]", iconBg: "bg-[#EBF3FF]", iconColor: "text-[#2563EB]",
    },
  ];

  return (
    <div className="flex flex-col gap-8">

      {/* Page header */}
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1F2937]">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-[#9CA3AF]">{today}</p>
      </div>

      {/* Stat cards grid — 2 cols */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {stats.map((s) => <StatCard key={s.label} s={s} />)}
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Recent Blotter */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-[#1F2937]">Recent Blotter Cases</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Latest filed and ongoing cases</p>
            </div>
            <Link
              href="/blotter"
              className="flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:text-[#2563EB] transition shrink-0 mt-0.5"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {data.recentBlotterCases.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#9CA3AF]">No blotter cases filed yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#F4F5F7]">
              {data.recentBlotterCases.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1F2937] truncate">{b.case_number}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">
                      {b.complainant_name} vs {b.respondent_name}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[#1F2937]">Recent Activity</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Latest actions across all modules</p>
          </div>

          {data.recentActivity.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#9CA3AF]">No activity recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#F4F5F7]">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F2937] leading-snug">{activityLabel(a)}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{a.user.username} · {formatRelativeTime(a.performed_at)}</p>
                  </div>
                  <span className="text-[11px] font-semibold bg-[#F4F5F7] text-[#6B7280] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                    {a.table_affected}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}