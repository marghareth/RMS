// FILE: src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Users, FileText, Shield, Package, DoorOpen, CalendarClock, CheckCircle2,
  ArrowUpRight, ArrowDownRight, SlidersHorizontal,
  UserPlus, FilePlus2, ScrollText, LogIn,
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";
import DashboardCustomizeSheet from "@/components/dashboard/DashboardCustomizeSheet";
import { type DashboardPreferenceMap, type WidgetKey } from "@/lib/dashboard-defaults";

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
  totalResidents: number;
  totalHouseholds: number;
  activeCases: number;
  borrowedEquipment: number;
  certsThisMonth: number;
  certsThisYear: number;
  recentActivity: ActivityRow[];
  recentBlotterCases: BlotterCaseRow[];
  documentRequestsPending: number;
  visitorsActive: number;
  meetingsToday: number;
  settledCases: number;
  totalAssets: number;
  documentsByStatus: { status: string; count: number }[];
  trends: {
    residents: number | null;
    households: number | null;
    certsMonth: number | null;
    equipment: number | null;
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityLabel(a: ActivityRow): string {
  return a.details ?? `${a.action} — ${a.table_affected}`;
}

function TrendBadge({ value }: { value: number | null | undefined }) {
  if (value === undefined) return null;
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
  key: WidgetKey;
  label: string;
  value: string;
  trend?: number | null;
  sub: string;
  desc: string;
  icon: React.ElementType;
  valueColor: string;
  iconBg: string;
  iconColor: string;
  href: string;
}

function StatCard({ s }: { s: StatCardDef }) {
  const Icon = s.icon;
  return (
    <Link
      href={s.href}
      className="flex flex-col gap-4 rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#3B82F6]/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{s.label}</p>
          <p className={`text-4xl font-bold leading-none ${s.valueColor}`}>{s.value}</p>
        </div>
        <TrendBadge value={s.trend} />
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
    </Link>
  );
}

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "New Resident", href: "/residents/new", icon: UserPlus, bg: "bg-[#EBF3FF]", color: "text-[#2563EB]" },
  { label: "New Certificate", href: "/certificates/new", icon: FilePlus2, bg: "bg-[#FEF3C7]", color: "text-[#D97706]" },
  { label: "File Blotter Case", href: "/blotter/new", icon: ScrollText, bg: "bg-[#FEE2E2]", color: "text-[#DC2626]" },
  { label: "Log Visitor", href: "/visitors/new", icon: LogIn, bg: "bg-[#D1FAE5]", color: "text-[#059669]" },
];

function QuickActionsPanel() {
  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-base font-semibold text-[#1F2937] mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-start gap-2.5 rounded-xl border border-[#E9EAEC] p-4 transition hover:border-[#3B82F6]/40 hover:bg-[#F9FAFB]"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.bg}`}>
                <Icon size={16} className={a.color} />
              </div>
              <p className="text-[13px] font-semibold text-[#1F2937] leading-tight">{a.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── PRIORITY TASKS ───────────────────────────────────────────────────────────
function PriorityTasksPanel({ data }: { data: DashboardData }) {
  const tasks = [
    {
      label: `${data.documentRequestsPending} document request${data.documentRequestsPending === 1 ? "" : "s"} pending`,
      show: data.documentRequestsPending > 0,
      href: "/certificates",
      color: "bg-amber-500",
    },
    {
      label: `${data.activeCases} blotter case${data.activeCases === 1 ? "" : "s"} awaiting resolution`,
      show: data.activeCases > 0,
      href: "/blotter",
      color: "bg-red-500",
    },
    {
      label: `${data.visitorsActive} visitor${data.visitorsActive === 1 ? "" : "s"} still checked in`,
      show: data.visitorsActive > 0,
      href: "/visitors",
      color: "bg-blue-500",
    },
    {
      label: `${data.meetingsToday} meeting${data.meetingsToday === 1 ? "" : "s"} scheduled today`,
      show: data.meetingsToday > 0,
      href: "/meetings",
      color: "bg-green-500",
    },
  ].filter((t) => t.show);

  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-base font-semibold text-[#1F2937] mb-1">Priority Tasks</h2>
      <p className="text-xs text-[#9CA3AF] mb-4">Things that may need your attention</p>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#9CA3AF]">Nothing pending — you&apos;re all caught up.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[#F4F5F7]">
          {tasks.map((t) => (
            <Link key={t.label} href={t.href} className="flex items-center gap-3 py-3 group">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.color}`} />
              <p className="text-sm font-medium text-[#1F2937] group-hover:text-[#3B82F6] transition flex-1">
                {t.label}
              </p>
              <ArrowUpRight size={14} className="text-[#D1D5DB] group-hover:text-[#3B82F6] transition shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DOCUMENT STATUS CHART ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-400",
  PROCESSING: "bg-blue-400",
  RELEASED: "bg-green-500",
  CANCELLED: "bg-gray-300",
};

function DocumentStatusChart({ data }: { data: DashboardData }) {
  const total = data.documentsByStatus.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-base font-semibold text-[#1F2937] mb-1">Document Status</h2>
      <p className="text-xs text-[#9CA3AF] mb-4">Breakdown of all document requests</p>

      {total === 0 ? (
        <p className="py-6 text-center text-xs text-[#9CA3AF]">No document requests on file yet.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F4F5F7] mb-4">
            {data.documentsByStatus.map((d) => (
              <div
                key={d.status}
                className={STATUS_COLORS[d.status] ?? "bg-gray-300"}
                style={{ width: `${(d.count / total) * 100}%` }}
                title={`${d.status}: ${d.count}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.documentsByStatus.map((d) => (
              <div key={d.status} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[d.status] ?? "bg-gray-300"}`} />
                <p className="text-xs text-[#374151]">
                  {d.status.charAt(0) + d.status.slice(1).toLowerCase()}{" "}
                  <span className="text-[#9CA3AF]">({d.count})</span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preferences, setPreferences] = useState<DashboardPreferenceMap | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => { if (!r.ok) throw new Error("Failed to load dashboard data"); return r.json(); })
      .then((d: DashboardData) => setData(d))
      .catch((e) => setError(e.message || "Something went wrong."))
      .finally(() => setLoading(false));

    fetch("/api/dashboard-preferences")
      .then((r) => { if (!r.ok) throw new Error("Failed to load preferences"); return r.json(); })
      .then((d) => setPreferences(d.preferences))
      .catch(() => {
        // Preferences are enhancement-only — if they fail to load, every
        // widget just stays visible via the `?? true` fallback below.
      });
  }, []);

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  function isOn(key: WidgetKey) {
    return preferences ? preferences[key] : true;
  }

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

  const allStats: StatCardDef[] = [
    {
      key: "kpi_residents", label: "Residents", value: data.totalResidents.toLocaleString(),
      trend: data.trends.residents, sub: "Active registered residents",
      desc: "Non-archived residents in RBI", icon: Users,
      valueColor: "text-[#2563EB]", iconBg: "bg-[#EBF3FF]", iconColor: "text-[#2563EB]",
      href: "/residents",
    },
    {
      key: "kpi_document_requests", label: "Document Requests", value: data.documentRequestsPending.toLocaleString(),
      sub: "Pending certificates", desc: "Awaiting processing", icon: FileText,
      valueColor: "text-[#D97706]", iconBg: "bg-[#FEF3C7]", iconColor: "text-[#D97706]",
      href: "/certificates",
    },
    {
      key: "kpi_blotter_cases", label: "Blotter Cases", value: data.activeCases.toLocaleString(),
      sub: "Filed and ongoing cases", desc: "Cases awaiting resolution", icon: Shield,
      valueColor: "text-[#DC2626]", iconBg: "bg-[#FEE2E2]", iconColor: "text-[#DC2626]",
      href: "/blotter",
    },
    {
      key: "kpi_visitors", label: "Visitors", value: data.visitorsActive.toLocaleString(),
      sub: "Currently checked in", desc: "Active visitor log entries", icon: DoorOpen,
      valueColor: "text-[#059669]", iconBg: "bg-[#D1FAE5]", iconColor: "text-[#059669]",
      href: "/visitors",
    },
    {
      key: "kpi_meetings_today", label: "Meetings Today", value: data.meetingsToday.toLocaleString(),
      sub: "Scheduled for today", desc: "SB meetings & assemblies", icon: CalendarClock,
      valueColor: "text-[#7C3AED]", iconBg: "bg-[#EDE9FE]", iconColor: "text-[#7C3AED]",
      href: "/meetings",
    },
    {
      key: "kpi_assets", label: "Assets", value: data.totalAssets.toLocaleString(),
      trend: data.trends.equipment, sub: "Inventory items", desc: `${data.borrowedEquipment} currently borrowed`, icon: Package,
      valueColor: "text-[#D97706]", iconBg: "bg-[#FEF3C7]", iconColor: "text-[#D97706]",
      href: "/equipment",
    },
    {
      key: "kpi_settled_cases", label: "Settled Cases", value: data.settledCases.toLocaleString(),
      sub: "Resolved & dismissed", desc: "Total blotter cases closed", icon: CheckCircle2,
      valueColor: "text-[#059669]", iconBg: "bg-[#D1FAE5]", iconColor: "text-[#059669]",
      href: "/blotter",
    },
  ];

  const visibleStats = allStats.filter((s) => isOn(s.key));

  return (
    <div className="flex flex-col gap-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1F2937]">Dashboard</h1>
          <p className="mt-1.5 text-sm text-[#9CA3AF]">{today}</p>
        </div>
        <button
          onClick={() => setCustomizeOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-[#F4F5F7]"
        >
          <SlidersHorizontal size={14} />
          Customize
        </button>
      </div>

      {/* KPI stat cards */}
      {visibleStats.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleStats.map((s) => <StatCard key={s.key} s={s} />)}
        </div>
      )}

      {/* Quick Actions + Priority Tasks */}
      {(isOn("quick_actions") || isOn("priority_tasks")) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {isOn("quick_actions") && <QuickActionsPanel />}
          {isOn("priority_tasks") && <PriorityTasksPanel data={data} />}
        </div>
      )}

      {/* Activity Feed + Document Status Chart */}
      {(isOn("activity_feed") || isOn("document_status_chart")) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {isOn("activity_feed") && (
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
          )}
          {isOn("document_status_chart") && <DocumentStatusChart data={data} />}
        </div>
      )}

      {/* Recent Blotter Cases — always shown; not user-togglable per spec */}
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

      {preferences && (
        <DashboardCustomizeSheet
          open={customizeOpen}
          preferences={preferences}
          onClose={() => setCustomizeOpen(false)}
          onSaved={(prefs) => { setPreferences(prefs); setCustomizeOpen(false); }}
        />
      )}
    </div>
  );
}