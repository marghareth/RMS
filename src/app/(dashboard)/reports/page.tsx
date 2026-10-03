// FILE: src/app/(dashboard)/reports/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FileText, Shield, Wallet,
  Package, BookOpen,
  ChevronRight, Download, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { fetchJson, runWithConcurrency } from "@/lib/fetch-json";

const BLOTTER_STATUS_COLORS: Record<string, string> = {
  FILED: "#3E5C76",
  ONGOING: "#B45309",
  RESOLVED: "#0B6E4F",
  DISMISSED: "#9CA3AF",
};

const BLOTTER_STATUS_LABELS: Record<string, string> = {
  FILED: "Filed",
  ONGOING: "Ongoing",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

function formatCurrency(n: number) {
  return `\u20B1${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * A figure that couldn't be loaded is `null`, shown as an em dash. It must
 * never be shown as 0: "0 residents" is a claim about the barangay, whereas
 * "—" says "we don't know".
 */
const UNKNOWN = "\u2014";
const fmtCount = (n: number | null) => (n === null ? UNKNOWN : n.toLocaleString());
const fmtMoney = (n: number | null) => (n === null ? UNKNOWN : formatCurrency(n));
/** Only trust real numbers from an API body; anything else is "unknown". */
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

interface Summary {
  totalResidents: number | null;
  certificatesMonth: number | null;
  activeBlotter: number | null;
  totalEquipment: number | null;
  seniorCitizens: number | null;
  pwdCount: number | null;
  fourPsCount: number | null;
  monthlyIncome: number | null;
  monthlyExpense: number | null;
}

/** A section of the overview whose data couldn't be loaded, and why. */
interface LoadIssue { key: string; label: string; detail: string }

interface PurokDatum { purok: string; count: number }
interface CertDatum { name: string; value: number }
interface BlotterDatum { name: string; value: number; color: string }

// Everything starts unknown (null) and is filled in as each request succeeds.
const EMPTY_SUMMARY: Summary = {
  totalResidents: null, certificatesMonth: null, activeBlotter: null, totalEquipment: null,
  seniorCitizens: null, pwdCount: null, fourPsCount: null, monthlyIncome: null, monthlyExpense: null,
};

const EXPORTABLE_REPORT_TYPES = ["certificates", "financial", "blotter", "inventory", "registries"] as const;

export default function ReportsPage() {
  const router = useRouter();
  const now = new Date();
  const today = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [populationByPurok, setPopulationByPurok] = useState<PurokDatum[]>([]);
  const [certByType, setCertByType] = useState<CertDatum[]>([]);
  const [blotterByStatus, setBlotterByStatus] = useState<BlotterDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [issues, setIssues] = useState<LoadIssue[]>([]);

  // Guards setState after the page is left while requests are still running.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async () => {
    const current = new Date();
    const year = String(current.getFullYear());
    const month = String(current.getMonth() + 1).padStart(2, "0");

    setLoading(true);
    setIssues([]);

    // Population-by-purok needs both /api/dashboard (counts) and /api/puroks
    // (names), which arrive independently — rebuild whenever either lands.
    const ctx: { dashboard?: { residentsByPurok?: { purok_id: number | null; _count: number }[] }; puroks?: { id: number; name: string }[] } = {};
    const rebuildPopulation = () => {
      if (!ctx.dashboard) return;
      const names = new Map<number, string>((ctx.puroks ?? []).map((p) => [p.id, p.name]));
      setPopulationByPurok(
        (ctx.dashboard.residentsByPurok ?? [])
          .map((p) => ({
            purok: p.purok_id == null ? "Unassigned" : names.get(p.purok_id) ?? `Purok #${p.purok_id}`,
            count: p._count,
          }))
          .sort((a, b) => a.purok.localeCompare(b.purok))
      );
    };

    // Each section is independent: its own request, its own success/failure.
    // One failing endpoint leaves the other cards intact instead of zeroing everything.
    const sections: { key: string; label: string; url: string; apply: (d: any) => void }[] = [
      {
        key: "dashboard", label: "Resident and blotter totals", url: "/api/dashboard",
        apply: (d) => {
          setSummary((p) => ({ ...p, totalResidents: num(d.totalResidents), activeBlotter: num(d.activeCases) }));
          ctx.dashboard = d;
          rebuildPopulation();
        },
      },
      {
        key: "puroks", label: "Purok names", url: "/api/puroks",
        apply: (d) => {
          ctx.puroks = Array.isArray(d) ? d : [];
          rebuildPopulation();
        },
      },
      {
        key: "certificates", label: "Certificates", url: `/api/reports?type=certificates&year=${year}&month=${month}`,
        apply: (d) => {
          setSummary((p) => ({ ...p, certificatesMonth: num(d.totalThisMonth) }));
          setCertByType(
            (Array.isArray(d.byType) ? d.byType : [])
              .map((c: { type: string; count: number }) => ({ name: c.type, value: c.count }))
              .sort((a: CertDatum, b: CertDatum) => b.value - a.value)
              .slice(0, 5)
          );
        },
      },
      {
        key: "blotter", label: "Blotter", url: "/api/reports?type=blotter",
        apply: (d) =>
          setBlotterByStatus(
            (["FILED", "ONGOING", "RESOLVED", "DISMISSED"] as const)
              .map((status) => ({
                name: BLOTTER_STATUS_LABELS[status],
                value: num(d[status.toLowerCase()]) ?? 0,
                color: BLOTTER_STATUS_COLORS[status],
              }))
              .filter((b) => b.value > 0)
          ),
      },
      {
        key: "financial", label: "Finance", url: `/api/reports?type=financial&year=${year}&month=${month}`,
        apply: (d) => setSummary((p) => ({ ...p, monthlyIncome: num(d.totalIncome), monthlyExpense: num(d.totalExpense) })),
      },
      {
        key: "inventory", label: "Inventory", url: "/api/reports?type=inventory",
        apply: (d) => setSummary((p) => ({ ...p, totalEquipment: num(d.total) })),
      },
      {
        key: "registries", label: "Special registries", url: "/api/reports?type=registries",
        apply: (d) =>
          setSummary((p) => ({
            ...p,
            seniorCitizens: num(d.seniors?.total),
            pwdCount: num(d.pwd?.total),
            fourPsCount: num(d.fourPs?.total),
          })),
      },
    ];

    // At most 3 requests at a time: every one of these runs several database
    // queries, and firing all seven at once can exhaust a small connection
    // pool (the symptom is timeouts/503s that used to surface as zeros).
    await runWithConcurrency(
      sections.map((sec) => async () => {
        const result = await fetchJson(sec.url);
        if (!alive.current) return;
        if (result.ok) {
          try {
            sec.apply(result.data);
          } catch (err) {
            console.error(`[reports] could not read "${sec.key}" response:`, err);
            setIssues((prev) => [...prev, { key: sec.key, label: sec.label, detail: "The response was not in the expected format." }]);
          }
        } else {
          setIssues((prev) => [...prev, { key: sec.key, label: sec.label, detail: result.status ? `${result.detail} (HTTP ${result.status})` : result.detail }]);
        }
      }),
      3
    );

    if (alive.current) setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const failed = new Set(issues.map((i) => i.key));

  const netBalance =
    summary.monthlyIncome === null || summary.monthlyExpense === null
      ? null
      : summary.monthlyIncome - summary.monthlyExpense;
  const registered =
    summary.seniorCitizens === null || summary.pwdCount === null || summary.fourPsCount === null
      ? null
      : summary.seniorCitizens + summary.pwdCount + summary.fourPsCount;

  function handleExportAll() {
    setExporting(true);
    const year = String(now.getFullYear());
    EXPORTABLE_REPORT_TYPES.forEach((type) => {
      window.open(`/api/pdf/report/${type}?year=${year}`, "_blank");
    });
    setExporting(false);
  }

  const REPORT_MODULES = [
    {
      key: "population", label: "Population Report",
      description: "Residents by purok, sex, age group & civil status",
      icon: Users, accent: "text-[#3E5C76] dark:text-[#8FB0CC]",
      stat: `${fmtCount(summary.totalResidents)} residents`,
    },
    {
      key: "certificates", label: "Certificate Report",
      description: "Issuance history by type, month & year",
      icon: FileText, accent: "text-[#0B6E4F] dark:text-[#34A37A]",
      stat: `${fmtCount(summary.certificatesMonth)} issued this month`,
    },
    {
      key: "blotter", label: "Blotter Report",
      description: "Case status, escalations & incident trends",
      icon: Shield, accent: "text-[#B45309] dark:text-[#FBBF24]",
      stat: `${fmtCount(summary.activeBlotter)} active cases`,
    },
    {
      key: "financial", label: "Financial Report",
      description: "Income vs. expense summary by period",
      icon: Wallet, accent: "text-[#6D4AFF] dark:text-[#A78BFA]",
      stat: `${fmtMoney(netBalance)} net`,
    },
    {
      key: "inventory", label: "Inventory Report",
      description: "Equipment status, borrowings & year-end count",
      icon: Package, accent: "text-[#B3261E] dark:text-[#F87171]",
      stat: `${fmtCount(summary.totalEquipment)} total items`,
    },
    {
      key: "registries", label: "Special Registries",
      description: "Senior citizens, PWD, and 4Ps per purok",
      icon: BookOpen, accent: "text-[#0E7490] dark:text-[#22D3EE]",
      stat: `${fmtCount(registered)} registered`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        subtitle={`Overview as of ${today}`}
        actions={
          <button
            data-tour="page-reports-export-all"
            onClick={handleExportAll}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] text-[#6B7280] dark:text-[#A3A3A3] text-[13px] font-bold hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            {exporting ? "Exporting…" : "Export All"}
          </button>
        }
      />

      {issues.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C] dark:border-[#7F1D1D] dark:bg-[#2A1212] dark:text-[#FCA5A5]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">
              Some figures couldn&apos;t be loaded. They are shown as &ldquo;{UNKNOWN}&rdquo; — not as 0.
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {issues.map((i) => (
                <li key={i.key}>
                  <span className="font-semibold">{i.label}:</span> {i.detail}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:opacity-50 dark:border-[#7F1D1D] dark:bg-transparent dark:hover:bg-[#3B1212]"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      <div data-tour="page-reports-stats" className="grid grid-cols-4 gap-3">
        <StatCard label="Total Residents" value={fmtCount(summary.totalResidents)} icon={Users} color="blue" />
        <StatCard label="Certs This Month" value={fmtCount(summary.certificatesMonth)} icon={FileText} color="green" />
        <StatCard label="Active Blotter" value={fmtCount(summary.activeBlotter)} icon={Shield} color="amber" />
        <StatCard label="Net Balance" value={fmtMoney(netBalance)} icon={Wallet} color="purple" />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3] mb-3">Report Modules</p>
        <div data-tour="page-reports-modules" className="grid grid-cols-3 gap-4">
          {REPORT_MODULES.map(mod => (
            <ModuleCard key={mod.key} mod={mod} onClick={() => router.push(`/reports/${mod.key}`)} />
          ))}
        </div>
      </div>

      <div data-tour="page-reports-charts" className="grid grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Population by Purok</p>
            <button onClick={() => router.push("/reports/population")} className="text-[11px] font-bold text-[#0B6E4F] dark:text-[#34A37A] hover:text-[#095c41] dark:hover:text-[#3FBB8C] transition">
              Full Report →
            </button>
          </div>
          {!loading && populationByPurok.length === 0 ? (
            <EmptyChartState failed={failed.has("dashboard")} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={populationByPurok} barSize={28}>
                <XAxis dataKey="purok" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#0B6E4F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Blotter Case Status</p>
            <button onClick={() => router.push("/reports/blotter")} className="text-[11px] font-bold text-[#0B6E4F] dark:text-[#34A37A] hover:text-[#095c41] dark:hover:text-[#3FBB8C] transition">
              Full Report →
            </button>
          </div>
          {!loading && blotterByStatus.every(b => b.value === 0) ? (
            <EmptyChartState failed={failed.has("blotter")} />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={blotterByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {blotterByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {blotterByStatus.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-bold tabular-nums text-[#1B2430] dark:text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div data-tour="page-reports-certs" className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
          <p className="text-[12px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Certificates Issued This Month</p>
          <button onClick={() => router.push("/reports/certificates")} className="text-[11px] font-bold text-[#0B6E4F] dark:text-[#34A37A] hover:text-[#095c41] dark:hover:text-[#3FBB8C] transition">
            Full Report →
          </button>
        </div>
        {!loading && certByType.length === 0 ? (
          <div className="px-5 py-6"><EmptyChartState failed={failed.has("certificates")} /></div>
        ) : (
          <div className="grid grid-cols-5 divide-x divide-[#F4F5F7] dark:divide-[#262626]">
            {certByType.map(c => (
              <div key={c.name} className="px-4 py-4 text-center">
                <p className="text-[22px] font-bold tabular-nums text-[#1B2430] dark:text-white">{c.value}</p>
                <p className="text-[10px] font-semibold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide mt-0.5">{c.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCard({ mod, onClick }: { mod: { key: string; label: string; description: string; icon: any; accent: string; stat: string }; onClick: () => void }) {
  const Icon = mod.icon;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 text-left transition hover:border-[#0B6E4F]/30 dark:hover:border-[#34A37A]/40 hover:bg-[#E8F3EE]/50 dark:hover:bg-[#11321F]/60"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F7] dark:bg-[#262626]">
          <Icon size={18} className={mod.accent} />
        </div>
        <ChevronRight size={16} className="mt-1 text-[#D1D5DB] dark:text-[#525252] transition-colors group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]" />
      </div>
      <div>
        <p className="text-[13px] font-bold uppercase tracking-wide text-[#1B2430] dark:text-white">{mod.label}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF] dark:text-[#A3A3A3]">{mod.description}</p>
      </div>
      <p className="text-[11px] font-semibold tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{mod.stat}</p>
    </button>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#171717] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[11px] font-bold text-[#1F2937] dark:text-white">{label}</p>
      <p className="text-[11px] text-[#0B6E4F] dark:text-[#34A37A]">{payload[0]?.value} residents</p>
    </div>
  );
}

function EmptyChartState({ failed = false }: { failed?: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
      {failed ? "Couldn\u2019t load this chart \u2014 see the message above." : "No data for this period yet."}
    </div>
  );
}