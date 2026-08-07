// FILE: src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Users, FileText, Shield, Package,
  ArrowUpRight, ArrowDownRight, DoorOpen, CalendarCheck2, CheckCircle2,
  SlidersHorizontal, UserPlus, HomeIcon, FilePlus2, ShieldAlert,
  PackagePlus, CalendarPlus, AlertTriangle, Clock, Gavel,
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import {
  ALL_WIDGET_KEYS, KPI_WIDGET_KEYS, WIDGET_LABELS, PANEL_WIDGET_DESCRIPTIONS, WidgetKey,
} from "@/lib/dashboard-widgets";

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

interface DocumentStatusCount {
  status: "PENDING" | "PROCESSING" | "RELEASED" | "CANCELLED";
  count: number;
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
  visitorsActive: number;
  meetingsToday: number;
  settledCases: number;
  documentStatusCounts: DocumentStatusCount[];
  priorityTasks: {
    overdueEquipmentReturns: number;
    filedBlotterCases: number;
    overdueHearings: number;
  };
}

interface WidgetPreference {
  widget_key: WidgetKey;
  is_enabled: boolean;
  is_default: boolean;
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
  key: WidgetKey;
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

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "New Resident",   href: "/residents/new",   icon: UserPlus,    bg: "bg-[#EBF3FF]", color: "text-[#2563EB]" },
  { label: "New Household",  href: "/households/new",  icon: HomeIcon,    bg: "bg-[#D1FAE5]", color: "text-[#059669]" },
  { label: "New Document",   href: "/certificates/new", icon: FilePlus2,  bg: "bg-[#FEF3C7]", color: "text-[#D97706]" },
  { label: "New Blotter",    href: "/blotter/new",     icon: ShieldAlert, bg: "bg-[#FEE2E2]", color: "text-[#DC2626]" },
  { label: "New Asset",      href: "/equipment/new",   icon: PackagePlus, bg: "bg-[#EDE9FE]", color: "text-[#7C3AED]" },
  { label: "New Meeting",    href: "/meetings/new",    icon: CalendarPlus, bg: "bg-[#E0F2FE]", color: "text-[#0284C7]" },
];

function QuickActionsPanel() {
  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-base font-semibold text-[#1F2937] mb-4">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-[#F4F5F7] px-3 py-4 text-center transition hover:border-[#E9EAEC] hover:bg-[#F9FAFB]"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.bg}`}>
                <Icon size={16} className={a.color} />
              </div>
              <span className="text-[11px] font-semibold text-[#374151] leading-tight">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── PRIORITY TASKS ───────────────────────────────────────────────────────────
function PriorityTasksPanel({ tasks }: { tasks: DashboardData["priorityTasks"] }) {
  const items = [
    {
      count: tasks.overdueEquipmentReturns,
      label: "equipment borrowing(s) overdue for return",
      href: "/equipment/borrow",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      count: tasks.overdueHearings,
      label: "blotter case(s) past their scheduled hearing date",
      href: "/blotter",
      icon: Gavel,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      count: tasks.filedBlotterCases,
      label: "blotter case(s) filed and awaiting action",
      href: "/blotter",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ].filter((t) => t.count > 0);

  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#1F2937]">Priority Tasks</h2>
        <p className="text-xs text-[#9CA3AF] mt-0.5">Items that may need your attention</p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <CheckCircle2 size={24} className="text-green-500" />
          <p className="text-xs text-[#9CA3AF]">Nothing pending — youre all caught up.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#F4F5F7]">
          {items.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.label} href={t.href} className="flex items-center gap-3 py-3 group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}>
                  <Icon size={14} className={t.color} />
                </div>
                <p className="flex-1 text-sm text-[#1F2937] group-hover:text-[#3B82F6] transition">
                  <span className="font-bold">{t.count}</span> {t.label}
                </p>
                <ArrowUpRight size={13} className="text-[#D1D5DB] group-hover:text-[#3B82F6] transition shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DOCUMENT STATUS CHART ────────────────────────────────────────────────────
const DOC_STATUS_CONFIG: Record<DocumentStatusCount["status"], { label: string; bar: string; text: string }> = {
  PENDING:    { label: "Pending",    bar: "bg-amber-400",  text: "text-amber-600"  },
  PROCESSING: { label: "Processing", bar: "bg-blue-400",   text: "text-blue-600"   },
  RELEASED:   { label: "Released",   bar: "bg-green-500",  text: "text-green-600"  },
  CANCELLED:  { label: "Cancelled",  bar: "bg-gray-300",   text: "text-gray-500"   },
};

function DocumentStatusChart({ counts }: { counts: DocumentStatusCount[] }) {
  const total = counts.reduce((n, c) => n + c.count, 0);
  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#1F2937]">Document Status</h2>
        <p className="text-xs text-[#9CA3AF] mt-0.5">All document requests on file, by status</p>
      </div>
      {total === 0 ? (
        <p className="py-6 text-center text-xs text-[#9CA3AF]">No document requests yet.</p>
      ) : (
        <div className="space-y-3">
          {counts.map((c) => {
            const cfg = DOC_STATUS_CONFIG[c.status];
            const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
            return (
              <div key={c.status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#374151]">{cfg.label}</span>
                  <span className={`text-xs font-bold ${cfg.text}`}>{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[#F4F5F7] overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CUSTOMIZE PANEL ──────────────────────────────────────────────────────────
const PANEL_WIDGET_KEYS = ["quick_actions", "priority_tasks", "activity_feed", "document_status_chart"] as const;

function CustomizePanel({
  open, onOpenChange, preferences, onSave, onReset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preferences: WidgetPreference[];
  onSave: (next: Record<WidgetKey, boolean>) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<WidgetKey, boolean>>({} as Record<WidgetKey, boolean>);
  const [syncedFor, setSyncedFor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Re-seed the draft from the latest server-resolved preferences every
  // time the panel opens — adjusted during render (not inside an effect),
  // the same pattern used elsewhere in this app for "reset local state
  // when a prop changes".
  if (open && !syncedFor) {
    setSyncedFor(true);
    const seed = {} as Record<WidgetKey, boolean>;
    for (const p of preferences) seed[p.widget_key] = p.is_enabled;
    setDraft(seed);
  }
  if (!open && syncedFor) {
    setSyncedFor(false);
  }

  const kpiAllOn = KPI_WIDGET_KEYS.every((k) => draft[k]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await onReset();
      onOpenChange(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent widthClassName="max-w-md">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          <div className="space-y-6">
            {/* KPI Metrics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">KPI Metrics</p>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kpiAllOn}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setDraft((p) => {
                        const next = { ...p };
                        for (const k of KPI_WIDGET_KEYS) next[k] = v;
                        return next;
                      });
                    }}
                    className="h-3.5 w-3.5 rounded accent-[#3B82F6]"
                  />
                  Show Metrics
                </label>
              </div>
              <div className="rounded-lg border border-[#E9EAEC] divide-y divide-[#F4F5F7]">
                {KPI_WIDGET_KEYS.map((k) => (
                  <label key={k} className="flex items-center justify-between px-3 py-2.5 text-[13px] text-[#374151] cursor-pointer">
                    {WIDGET_LABELS[k]}
                    <input
                      type="checkbox"
                      checked={!!draft[k]}
                      onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded accent-[#3B82F6]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Panel widgets */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-2">Panels</p>
              <div className="rounded-lg border border-[#E9EAEC] divide-y divide-[#F4F5F7]">
                {PANEL_WIDGET_KEYS.map((k) => (
                  <label key={k} className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer">
                    <span>
                      <span className="block text-[13px] font-medium text-[#374151]">{WIDGET_LABELS[k]}</span>
                      <span className="block text-[11px] text-[#9CA3AF]">{PANEL_WIDGET_DESCRIPTIONS[k]}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={!!draft[k]}
                      onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded accent-[#3B82F6] shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full rounded-lg border border-[#E9EAEC] py-2.5 text-[12px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7] disabled:opacity-50"
            >
              {resetting ? "Resetting…" : "Reset to Role Defaults"}
            </button>
          </div>
        </SheetBody>
        <SheetFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2.5 text-[13px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [preferences, setPreferences] = useState<WidgetPreference[] | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => { if (!r.ok) throw new Error("Failed to load dashboard data"); return r.json(); })
      .then((d: DashboardData) => setData(d))
      .catch((e) => setError(e.message || "Something went wrong."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard-preferences")
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((json) => { if (!cancelled) setPreferences(json.preferences); })
      .catch(() => { /* Preferences are additive UI polish — fall back to
        showing every widget below rather than blocking the dashboard on
        this call failing. */ });
    return () => { cancelled = true; };
  }, []);

  async function savePreferences(next: Record<WidgetKey, boolean>) {
    const res = await fetch("/api/dashboard-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: ALL_WIDGET_KEYS.map((widget_key) => ({ widget_key, is_enabled: !!next[widget_key] })),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setPreferences(json.preferences);
    }
  }

  async function resetPreferences() {
    const res = await fetch("/api/dashboard-preferences", { method: "DELETE" });
    if (res.ok) {
      const json = await res.json();
      setPreferences(json.preferences);
    }
  }

  // Preferences are additive polish, not gating: if they haven't loaded
  // (or failed to), every widget shows — nothing on the dashboard is
  // hidden by default just because this second, non-critical fetch is slow.
  const isEnabled = (key: WidgetKey) =>
    preferences ? preferences.find((p) => p.widget_key === key)?.is_enabled ?? true : true;

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
      key: "kpi_residents",
      label: "Residents", value: data.totalResidents.toLocaleString(),
      trend: data.trends.residents, sub: "Active registered residents",
      desc: "Non-archived residents in RBI", icon: Users,
      valueColor: "text-[#2563EB]", iconBg: "bg-[#EBF3FF]", iconColor: "text-[#2563EB]",
    },
    {
      key: "kpi_document_requests",
      label: "Document Requests", value: data.certsThisMonth.toLocaleString(),
      trend: data.trends.certsMonth, sub: "Certificates issued",
      desc: `Issued in ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, icon: FileText,
      valueColor: "text-[#D97706]", iconBg: "bg-[#FEF3C7]", iconColor: "text-[#D97706]",
    },
    {
      key: "kpi_blotter_cases",
      label: "Blotter Cases", value: data.activeCases.toLocaleString(),
      // No trend: this is a live snapshot count, not a monthly total —
      // there's no meaningful "vs last month" comparison for it.
      sub: "Filed and ongoing cases", desc: "Cases awaiting resolution", icon: Shield,
      valueColor: "text-[#DC2626]", iconBg: "bg-[#FEE2E2]", iconColor: "text-[#DC2626]",
    },
    {
      key: "kpi_visitors",
      label: "Visitors", value: data.visitorsActive.toLocaleString(),
      sub: "Currently checked in", desc: "Active barangay hall visitors", icon: DoorOpen,
      valueColor: "text-[#0284C7]", iconBg: "bg-[#E0F2FE]", iconColor: "text-[#0284C7]",
    },
    {
      key: "kpi_meetings_today",
      label: "Meetings Today", value: data.meetingsToday.toLocaleString(),
      sub: "Scheduled for today", desc: today, icon: CalendarCheck2,
      valueColor: "text-[#7C3AED]", iconBg: "bg-[#EDE9FE]", iconColor: "text-[#7C3AED]",
    },
    {
      key: "kpi_assets",
      label: "Assets", value: data.borrowedEquipment.toLocaleString(),
      trend: data.trends.equipment, sub: "Items currently out",
      desc: "Not yet returned", icon: Package,
      valueColor: "text-[#D97706]", iconBg: "bg-[#FEF3C7]", iconColor: "text-[#D97706]",
    },
    {
      key: "kpi_settled_cases",
      label: "Settled Cases", value: data.settledCases.toLocaleString(),
      sub: "Resolved or dismissed", desc: "Total blotter cases closed", icon: CheckCircle2,
      valueColor: "text-[#059669]", iconBg: "bg-[#D1FAE5]", iconColor: "text-[#059669]",
    },
  ];

  const visibleStats = stats.filter((s) => isEnabled(s.key));

  return (
    <div className="flex flex-col gap-8">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1F2937]">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-[#9CA3AF]">{today}</p>
        </div>
        <button
          onClick={() => setCustomizeOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-3.5 py-2 text-[12px] font-bold text-[#6B7280] shadow-sm transition hover:bg-[#F4F5F7]"
        >
          <SlidersHorizontal size={14} />
          Customize
        </button>
      </div>

      {/* Stat cards grid — 2 cols */}
      {visibleStats.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {visibleStats.map((s) => <StatCard key={s.key} s={s} />)}
        </div>
      )}

      {/* Quick Actions + Priority Tasks */}
      {(isEnabled("quick_actions") || isEnabled("priority_tasks")) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {isEnabled("quick_actions") && <QuickActionsPanel />}
          {isEnabled("priority_tasks") && <PriorityTasksPanel tasks={data.priorityTasks} />}
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Recent Blotter — not preference-gated; kept as a permanent
            fixture like the page header, since Batch 11 only names
            Activity Feed and Document Status Chart as toggleable panels. */}
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

        {/* Activity Feed */}
        {isEnabled("activity_feed") && (
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

        {/* Document Status Chart */}
        {isEnabled("document_status_chart") && (
          <DocumentStatusChart counts={data.documentStatusCounts} />
        )}
      </div>

      <CustomizePanel
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        preferences={preferences ?? ALL_WIDGET_KEYS.map((k) => ({ widget_key: k, is_enabled: true, is_default: true }))}
        onSave={savePreferences}
        onReset={resetPreferences}
      />
    </div>
  );
}