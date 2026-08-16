"use client";

// FILE: src/app/(dashboard)/dashboard/page.tsx
//
// UI REDESIGN (v2): same /api/dashboard + /api/dashboard-preferences data
// contract and the same DashboardPreference widget keys as before — this is
// a visual pass only, DashboardCustomizeSheet and per-role defaults in
// dashboard-defaults.ts are untouched.
//
// Design direction: this is an internal records/registry tool for a
// barangay office (RBI = registry of inhabitants, blotter = an actual
// police-style ledger, certificates already carry sequential queue
// numbers like "Q-2026-0001"). So the KPI row is built as a literal
// ledger — a single bordered grid of cells sharing hairlines, tabular
// figures — instead of a scatter of separate colored icon-badge cards.
// Kept deliberately quiet: one ink color for structure, one accent
// (seal green) used sparingly for the one interactive/active moment,
// muted status colors only where status is literally being reported.
import { useEffect, useState } from "react";
import {
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

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function activityLabel(a: ActivityRow): string {
  return a.details ?? `${a.action} — ${a.table_affected}`;
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Monogram({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E4E1D8] dark:border-[#3A3A3A] bg-white dark:bg-[#1F1F1F] text-[10px] font-bold text-[#1B2430] dark:text-white">
      {initials(name)}
    </span>
  );
}

function Trend({ value }: { value: number | null | undefined }) {
  if (value === undefined) return null;
  if (value === null) {
    return <span className="text-[11px] font-semibold text-[#3E5C76] dark:text-[#8FB0CC]">New</span>;
  }
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-[#0B6E4F] dark:text-[#34A37A]" : "text-[#B3261E] dark:text-[#F87171]"}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {up ? "+" : ""}{value}%
    </span>
  );
}

// ─── LEDGER STAT STRIP ──────────────────────────────────────────────────────
// One bordered grid, hairlines between every cell (via bg-border + gap-px),
// tabular figures — a registry row, not a stack of separate cards.
interface StatCell {
  key: WidgetKey;
  label: string;
  value: string;
  trend?: number | null;
  caption: string;
  href: string;
}

function LedgerStatStrip({ stats }: { stats: StatCell[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Link
          key={s.key}
          href={s.href}
          className="flex flex-col justify-between gap-4 rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition hover:border-[#0B6E4F]/30 dark:hover:border-[#34A37A]/50 hover:bg-[#E8F3EE]/50 dark:hover:bg-[#11321F]/60"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3]">{s.label}</p>
            <Trend value={s.trend} />
          </div>
          <div>
            <p className="text-[28px] font-bold leading-none text-[#1B2430] dark:text-white tabular-nums">
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{s.caption}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── QUICK ACTIONS (toolbar) ───────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "New Resident", href: "/residents/new", icon: UserPlus },
  { label: "New Certificate", href: "/certificates/new", icon: FilePlus2 },
  { label: "File Blotter Case", href: "/blotter/new", icon: ScrollText },
  { label: "Log Visitor", href: "/visitors/new", icon: LogIn },
];

function QuickActionsPanel() {
  return (
    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
      <h2 className="text-[13px] font-bold text-[#1B2430] dark:text-white">Quick Actions</h2>
      <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Jump straight to a new entry</p>
      <div className="mt-4 flex flex-col gap-2">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className="group flex items-center gap-3 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3.5 py-2.5 transition hover:border-[#0B6E4F]/30 dark:hover:border-[#34A37A]/40 hover:bg-[#E8F3EE]/50 dark:hover:bg-[#11321F]/60"
            >
              <Icon size={15} className="shrink-0 text-[#6B7280] dark:text-[#A3A3A3] transition group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]" />
              <p className="flex-1 text-[13px] font-medium text-[#374151] dark:text-[#D4D4D4] transition group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]">{a.label}</p>
              <ArrowUpRight size={13} className="shrink-0 text-[#D1D5DB] dark:text-[#525252] transition group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]" />
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
      dot: "bg-amber-500",
    },
    {
      label: `${data.activeCases} blotter case${data.activeCases === 1 ? "" : "s"} awaiting resolution`,
      show: data.activeCases > 0,
      href: "/blotter",
      dot: "bg-[#B3261E] dark:bg-[#F87171]",
    },
    {
      label: `${data.visitorsActive} visitor${data.visitorsActive === 1 ? "" : "s"} still checked in`,
      show: data.visitorsActive > 0,
      href: "/visitors",
      dot: "bg-[#3E5C76] dark:bg-[#8FB0CC]",
    },
    {
      label: `${data.meetingsToday} meeting${data.meetingsToday === 1 ? "" : "s"} scheduled today`,
      show: data.meetingsToday > 0,
      href: "/meetings",
      dot: "bg-[#0B6E4F] dark:bg-[#34A37A]",
    },
  ].filter((t) => t.show);

  return (
    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
      <h2 className="text-[13px] font-bold text-[#1B2430] dark:text-white">Priority Tasks</h2>
      <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Things that may need your attention</p>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#9CA3AF] dark:text-[#A3A3A3]">Nothing pending — you&apos;re all caught up.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-[#F4F5F7] dark:divide-[#262626]">
          {tasks.map((t) => (
            <Link key={t.label} href={t.href} className="group flex items-center gap-3 py-3">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
              <p className="flex-1 text-[13px] font-medium text-[#1B2430] dark:text-white transition group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]">
                {t.label}
              </p>
              <ArrowUpRight size={14} className="shrink-0 text-[#D1D5DB] dark:text-[#525252] transition group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DOCUMENT STATUS ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-400",
  PROCESSING: "bg-[#3E5C76] dark:bg-[#8FB0CC]",
  RELEASED: "bg-[#0B6E4F] dark:bg-[#34A37A]",
  CANCELLED: "bg-gray-300 dark:bg-gray-500",
};

function DocumentStatusChart({ data }: { data: DashboardData }) {
  const total = data.documentsByStatus.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
      <h2 className="text-[13px] font-bold text-[#1B2430] dark:text-white">Document Status</h2>
      <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Breakdown of all document requests</p>

      {total === 0 ? (
        <p className="py-6 text-center text-xs text-[#9CA3AF] dark:text-[#A3A3A3]">No document requests on file yet.</p>
      ) : (
        <>
          <div className="mb-4 mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[#F4F5F7] dark:bg-[#262626]">
            {data.documentsByStatus.map((d) => (
              <div
                key={d.status}
                className={STATUS_COLORS[d.status] ?? "bg-gray-300 dark:bg-gray-500"}
                style={{ width: `${(d.count / total) * 100}%` }}
                title={`${d.status}: ${d.count}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {data.documentsByStatus.map((d) => (
              <div key={d.status} className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[d.status] ?? "bg-gray-300 dark:bg-gray-500"}`} />
                <p className="text-xs text-[#374151] dark:text-[#D4D4D4]">
                  {d.status.charAt(0) + d.status.slice(1).toLowerCase()}{" "}
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3] tabular-nums">({d.count})</span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── RECENT ACTIVITY (ledger table) ─────────────────────────────────────────────
function RecentActivityTable({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
      <h2 className="text-[13px] font-bold text-[#1B2430] dark:text-white">Recent Activity</h2>
      <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Latest actions across all modules</p>

      {data.recentActivity.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#9CA3AF] dark:text-[#A3A3A3]">No activity recorded yet.</p>
      ) : (
        <table className="mt-4 w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-[#E9EAEC] dark:border-[#262626]">
              <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3]">Entry</th>
              <th className="hidden w-28 pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3] sm:table-cell">Module</th>
              <th className="w-20 pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3]">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F5F7] dark:divide-[#262626]">
            {data.recentActivity.map((a) => (
              <tr key={a.id}>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2.5">
                    <Monogram name={a.user.username} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1B2430] dark:text-white">{activityLabel(a)}</p>
                      <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{a.user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden py-3 pr-3 sm:table-cell">
                  <span className="block w-fit max-w-full truncate rounded border border-[#E9EAEC] dark:border-[#262626] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                    {a.table_affected}
                  </span>
                </td>
                <td className="whitespace-nowrap py-3 text-right text-[11px] tabular-nums text-[#9CA3AF] dark:text-[#A3A3A3]" title={formatClock(a.performed_at)}>
                  {formatRelativeTime(a.performed_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function isOn(key: WidgetKey) {
    return preferences ? preferences[key] : true;
  }

  if (loading) {
    return <div className="py-16 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">Loading dashboard…</div>;
  }
  if (error || !data) {
    return (
      <div className="py-16 text-center text-[13px] text-red-500 dark:text-red-400">
        {error || "Unable to load dashboard data."}
      </div>
    );
  }

  const allStats: StatCell[] = [
    {
      key: "kpi_residents", label: "Residents", value: data.totalResidents.toLocaleString(),
      trend: data.trends.residents, caption: `${data.totalHouseholds.toLocaleString()} households`,
      href: "/residents",
    },
    {
      key: "kpi_document_requests", label: "Documents", value: data.documentRequestsPending.toLocaleString(),
      caption: "pending requests",
      href: "/certificates",
    },
    {
      key: "kpi_blotter_cases", label: "Blotter", value: data.activeCases.toLocaleString(),
      caption: "cases awaiting resolution",
      href: "/blotter",
    },
    {
      key: "kpi_assets", label: "Assets", value: data.totalAssets.toLocaleString(),
      trend: data.trends.equipment, caption: `${data.borrowedEquipment} currently borrowed`,
      href: "/equipment",
    },
    {
      key: "kpi_visitors", label: "Visitors", value: data.visitorsActive.toLocaleString(),
      caption: "checked in now",
      href: "/visitors",
    },
    {
      key: "kpi_meetings_today", label: "Meetings", value: data.meetingsToday.toLocaleString(),
      caption: "scheduled today",
      href: "/meetings",
    },
    {
      key: "kpi_settled_cases", label: "Settled", value: data.settledCases.toLocaleString(),
      caption: "cases closed to date",
      href: "/blotter",
    },
  ];

  const visibleStats = allStats.filter((s) => isOn(s.key));

  return (
    <div className="flex flex-col gap-7">

      {/* Page header — double hairline underneath is the one recurring
          "letterhead" device used across the redesigned overview pages */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF] dark:text-[#A3A3A3]">Overview</p>
            <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-[#1B2430] dark:text-white">Dashboard</h1>
            <p className="mt-1 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">{today}</p>
          </div>
          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            <SlidersHorizontal size={14} />
            Customize
          </button>
        </div>
        <div className="mt-4 h-px bg-[#1B2430] dark:bg-[#E5E7EB]" />
        <div className="mt-0.75 h-px bg-[#E9EAEC] dark:bg-[#262626]" />
      </div>

      {/* KPI ledger strip */}
      {visibleStats.length > 0 && <LedgerStatStrip stats={visibleStats} />}

      {/* Quick Actions + Priority Tasks */}
      {(isOn("quick_actions") || isOn("priority_tasks")) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {isOn("quick_actions") && <QuickActionsPanel />}
          {isOn("priority_tasks") && <PriorityTasksPanel data={data} />}
        </div>
      )}

      {/* Activity Feed + Document Status */}
      {(isOn("activity_feed") || isOn("document_status_chart")) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {isOn("activity_feed") && <RecentActivityTable data={data} />}
          {isOn("document_status_chart") && <DocumentStatusChart data={data} />}
        </div>
      )}

      {/* Recent Blotter Cases — always shown; not user-togglable per spec */}
      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[13px] font-bold text-[#1B2430] dark:text-white">Recent Blotter Cases</h2>
            <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Latest filed and ongoing cases</p>
          </div>
          <Link
            href="/blotter"
            className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0B6E4F] dark:text-[#34A37A] transition hover:text-[#095c41] dark:hover:text-[#3FBB8C]"
          >
            View all <ArrowUpRight size={12} />
          </Link>
        </div>

        {data.recentBlotterCases.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#9CA3AF] dark:text-[#A3A3A3]">No blotter cases filed yet.</p>
        ) : (
          <table className="mt-4 w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626]">
                <th className="w-28 pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3] sm:w-36">Case No.</th>
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3]">Parties</th>
                <th className="w-24 pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3] sm:w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F7] dark:divide-[#262626]">
              {data.recentBlotterCases.map((b) => (
                <tr key={b.id}>
                  <td className="truncate py-3 pr-3 text-[13px] font-bold text-[#1B2430] dark:text-white tabular-nums">
                    {b.case_number}
                  </td>
                  <td className="truncate py-3 pr-3 text-[13px] text-[#374151] dark:text-[#D4D4D4]">
                    {b.complainant_name} <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">vs</span> {b.respondent_name}
                  </td>
                  <td className="py-3 text-right">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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