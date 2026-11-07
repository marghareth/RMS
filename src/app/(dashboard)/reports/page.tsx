// FILE: src/app/(dashboard)/reports/page.tsx
//
// REDESIGN (Nov 2026): the overview used to be sixteen identical cards in
// two loose grids ("Report Modules" / "More Reports"), each with a
// colored icon tile, followed by charts with ALL-CAPS headings. Now:
//   1. "At a glance" — the four headline figures in one row; each opens
//      its report.
//   2. All reports in one list, grouped by what they're about (People,
//      Documents and services, Peace and order, Money and property,
//      Council). Each row shows its live figure, or what period it covers.
//   3. "This month" — the population, blotter and certificate charts.
// Export all now downloads the PDFs instead of opening five tabs at once
// (pop-up blockers stopped all but the first).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
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
interface LoadIssue {
  key: string;
  label: string;
  detail: string;
}

interface PurokDatum {
  purok: string;
  count: number;
}
interface CertDatum {
  name: string;
  value: number;
}
interface BlotterDatum {
  name: string;
  value: number;
  color: string;
}

// Everything starts unknown (null) and is filled in as each request succeeds.
const EMPTY_SUMMARY: Summary = {
  totalResidents: null,
  certificatesMonth: null,
  activeBlotter: null,
  totalEquipment: null,
  seniorCitizens: null,
  pwdCount: null,
  fourPsCount: null,
  monthlyIncome: null,
  monthlyExpense: null,
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
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const current = new Date();
    const year = String(current.getFullYear());
    const month = String(current.getMonth() + 1).padStart(2, "0");

    setLoading(true);
    setIssues([]);

    // Population-by-purok needs both /api/dashboard (counts) and /api/puroks
    // (names), which arrive independently — rebuild whenever either lands.
    const ctx: {
      dashboard?: { residentsByPurok?: { purok_id: number | null; _count: number }[] };
      puroks?: { id: number; name: string }[];
    } = {};
    const rebuildPopulation = () => {
      if (!ctx.dashboard) return;
      const names = new Map<number, string>((ctx.puroks ?? []).map((p) => [p.id, p.name]));
      setPopulationByPurok(
        (ctx.dashboard.residentsByPurok ?? [])
          .map((p) => ({
            purok: p.purok_id == null ? "Unassigned" : (names.get(p.purok_id) ?? `Purok #${p.purok_id}`),
            count: p._count,
          }))
          .sort((a, b) => a.purok.localeCompare(b.purok)),
      );
    };

    // Each section is independent: its own request, its own success/failure.
    // One failing endpoint leaves the other cards intact instead of zeroing everything.
    const sections: { key: string; label: string; url: string; apply: (d: any) => void }[] = [
      {
        key: "dashboard",
        label: "Resident and blotter totals",
        url: "/api/dashboard",
        apply: (d) => {
          setSummary((p) => ({ ...p, totalResidents: num(d.totalResidents), activeBlotter: num(d.activeCases) }));
          ctx.dashboard = d;
          rebuildPopulation();
        },
      },
      {
        key: "puroks",
        label: "Purok names",
        url: "/api/puroks",
        apply: (d) => {
          ctx.puroks = Array.isArray(d) ? d : [];
          rebuildPopulation();
        },
      },
      {
        key: "certificates",
        label: "Certificates",
        url: `/api/reports?type=certificates&year=${year}&month=${month}`,
        apply: (d) => {
          setSummary((p) => ({ ...p, certificatesMonth: num(d.totalThisMonth) }));
          setCertByType(
            (Array.isArray(d.byType) ? d.byType : [])
              .map((c: { type: string; count: number }) => ({ name: c.type, value: c.count }))
              .sort((a: CertDatum, b: CertDatum) => b.value - a.value)
              .slice(0, 5),
          );
        },
      },
      {
        key: "blotter",
        label: "Blotter",
        url: "/api/reports?type=blotter",
        apply: (d) =>
          setBlotterByStatus(
            (["FILED", "ONGOING", "RESOLVED", "DISMISSED"] as const)
              .map((status) => ({
                name: BLOTTER_STATUS_LABELS[status],
                value: num(d[status.toLowerCase()]) ?? 0,
                color: BLOTTER_STATUS_COLORS[status],
              }))
              .filter((b) => b.value > 0),
          ),
      },
      {
        key: "financial",
        label: "Finance",
        url: `/api/reports?type=financial&year=${year}&month=${month}`,
        apply: (d) => setSummary((p) => ({ ...p, monthlyIncome: num(d.totalIncome), monthlyExpense: num(d.totalExpense) })),
      },
      {
        key: "inventory",
        label: "Inventory",
        url: "/api/reports?type=inventory",
        apply: (d) => setSummary((p) => ({ ...p, totalEquipment: num(d.total) })),
      },
      {
        key: "registries",
        label: "Special registries",
        url: "/api/reports?type=registries",
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
            setIssues((prev) => [
              ...prev,
              { key: sec.key, label: sec.label, detail: "The response was not in the expected format." },
            ]);
          }
        } else {
          setIssues((prev) => [
            ...prev,
            {
              key: sec.key,
              label: sec.label,
              detail: result.status ? `${result.detail} (HTTP ${result.status})` : result.detail,
            },
          ]);
        }
      }),
      3,
    );

    if (alive.current) setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const failed = new Set(issues.map((i) => i.key));

  const netBalance =
    summary.monthlyIncome === null || summary.monthlyExpense === null ? null : summary.monthlyIncome - summary.monthlyExpense;
  const registered =
    summary.seniorCitizens === null || summary.pwdCount === null || summary.fourPsCount === null
      ? null
      : summary.seniorCitizens + summary.pwdCount + summary.fourPsCount;

  function handleExportAll() {
    setExporting(true);
    const year = String(now.getFullYear());
    // Same-origin links with `download` save the file directly. Spaced out
    // a little so the browser treats them as separate downloads; it may
    // ask once whether to allow several files.
    EXPORTABLE_REPORT_TYPES.forEach((type, i) => {
      window.setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/pdf/report/${type}?year=${year}`;
        a.download = `${type}-report-${year}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (i === EXPORTABLE_REPORT_TYPES.length - 1) setExporting(false);
      }, i * 600);
    });
  }

  const thisMonth = now.toLocaleDateString("en-US", { month: "long" });

  const GLANCE = [
    { label: "Residents", value: fmtCount(summary.totalResidents), href: "/reports/population" },
    { label: `Certificates in ${thisMonth}`, value: fmtCount(summary.certificatesMonth), href: "/reports/certificates" },
    { label: "Active blotter cases", value: fmtCount(summary.activeBlotter), href: "/reports/blotter" },
    { label: `Net balance, ${thisMonth}`, value: fmtMoney(netBalance), href: "/reports/financial" },
  ];

  const PERIOD = "By month or year";
  const TODAY = "As of today";
  const LIBRARY: { title: string; reports: { key: string; label: string; description: string; detail: string }[] }[] = [
    {
      title: "People",
      reports: [
        {
          key: "population",
          label: "Population",
          description: "Residents by purok, sex, age group and civil status",
          detail: `${fmtCount(summary.totalResidents)} residents`,
        },
        { key: "households", label: "Households", description: "By purok, size, housing and utilities", detail: TODAY },
        {
          key: "registries",
          label: "Special registries",
          description: "Senior citizens, PWD and 4Ps per purok",
          detail: `${fmtCount(registered)} registered`,
        },
        { key: "deceased", label: "Deaths", description: "Recorded deaths by cause, age and purok", detail: PERIOD },
        { key: "officials", label: "Officials", description: "Positions, terms, and terms ending soon", detail: TODAY },
      ],
    },
    {
      title: "Documents and services",
      reports: [
        {
          key: "certificates",
          label: "Certificates",
          description: "Issued by type, month and year",
          detail: `${fmtCount(summary.certificatesMonth)} issued this month`,
        },
        {
          key: "requests",
          label: "Summary of requests",
          description: "Documents, IDs, cases and borrowings requested",
          detail: PERIOD,
        },
        { key: "barangay-ids", label: "Barangay IDs", description: "Issued by month, purok and issuer", detail: PERIOD },
        {
          key: "processing",
          label: "Processing time",
          description: "How long each kind of request takes, step by step",
          detail: PERIOD,
        },
        { key: "visitors", label: "Visitor log", description: "Visits by purpose, office and time of day", detail: PERIOD },
      ],
    },
    {
      title: "Peace and order",
      reports: [
        {
          key: "blotter",
          label: "Blotter",
          description: "Case status, escalations and incident trends",
          detail: `${fmtCount(summary.activeBlotter)} active cases`,
        },
      ],
    },
    {
      title: "Money and property",
      reports: [
        {
          key: "financial",
          label: "Income and expenses",
          description: "Income vs. expense by period",
          detail: `${fmtMoney(netBalance)} net`,
        },
        {
          key: "finance",
          label: "Barangay finance",
          description: "Revenues, disbursements, appropriations, fund balances",
          detail: PERIOD,
        },
        {
          key: "inventory",
          label: "Inventory",
          description: "Equipment status, borrowings and year-end count",
          detail: `${fmtCount(summary.totalEquipment)} total items`,
        },
      ],
    },
    {
      title: "Council",
      reports: [
        { key: "meetings", label: "Meetings", description: "Sessions and assemblies, agenda and minutes", detail: PERIOD },
      ],
    },
  ];

  const maxCert = Math.max(1, ...certByType.map((c) => c.value));

  // Two balanced columns, so a short group (one report) never leaves a
  // gap beside a long one.
  const columns = [
    LIBRARY.filter((g) => ["People", "Peace and order", "Council"].includes(g.title)),
    LIBRARY.filter((g) => ["Documents and services", "Money and property"].includes(g.title)),
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Figures as of ${today}`}
        actions={
          <button
            data-tour="page-reports-export-all"
            onClick={handleExportAll}
            disabled={exporting}
            title="Downloads the certificate, financial, blotter, inventory and registries reports for this year"
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-semibold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} />
            {exporting ? "Downloading…" : "Export all"}
          </button>
        }
      />

      <div className="flex flex-col gap-8">
        {issues.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[12.5px] text-[#B91C1C] dark:border-[#7F1D1D] dark:bg-[#2A1212] dark:text-[#FCA5A5]"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                Some figures couldn&apos;t be loaded. They are shown as &ldquo;{UNKNOWN}&rdquo;, not as 0.
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
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:opacity-50 dark:border-[#7F1D1D] dark:bg-transparent dark:hover:bg-[#3B1212]"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {/* ── At a glance ── */}
        <section data-tour="page-reports-stats">
          <h2 className={SECTION_TITLE}>At a glance</h2>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#E9EAEC] bg-white dark:border-[#262626] dark:bg-[#171717] lg:grid-cols-4">
            {GLANCE.map((g, i) => (
              <Link
                key={g.label}
                href={g.href}
                className={`group px-5 py-4 transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F] ${i > 0 ? "border-l border-[#F0F1F3] dark:border-[#262626]" : ""} ${i === 2 ? "max-lg:border-l-0 max-lg:border-t" : ""} ${i === 3 ? "max-lg:border-t" : ""}`}
              >
                <p className="text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">{g.label}</p>
                <p className="mt-1 text-[24px] font-semibold leading-tight tabular-nums text-[#1B2430] dark:text-white">
                  {g.value}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── All reports, grouped ── */}
        <section data-tour="page-reports-modules">
          <h2 className={SECTION_TITLE}>All reports</h2>
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            {columns.map((col, ci) => (
              <div key={ci} className="space-y-5">
                {col.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">{group.title}</p>
                    <ul className="divide-y divide-[#F0F1F3] overflow-hidden rounded-xl border border-[#E9EAEC] bg-white dark:divide-[#262626] dark:border-[#262626] dark:bg-[#171717]">
                      {group.reports.map((r) => (
                        <li key={r.key}>
                          <Link
                            href={`/reports/${r.key}`}
                            className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] font-semibold text-[#1F2937] dark:text-white">{r.label}</p>
                              <p className="mt-0.5 truncate text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{r.description}</p>
                            </div>
                            <p
                              className={`shrink-0 text-right text-[12px] tabular-nums ${r.detail === PERIOD || r.detail === TODAY ? "text-[#9CA3AF] dark:text-[#737373]" : "font-medium text-[#374151] dark:text-[#D4D4D4]"}`}
                            >
                              {r.detail}
                            </p>
                            <ChevronRight
                              size={15}
                              className="shrink-0 text-[#C4C8CE] transition group-hover:text-[#6B7280] dark:text-[#525252]"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── This month ── */}
        <section>
          <h2 className={SECTION_TITLE}>This month</h2>
          <div data-tour="page-reports-charts" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartPanel title="Population by purok" href="/reports/population">
              {!loading && populationByPurok.length === 0 ? (
                <EmptyChartState failed={failed.has("dashboard")} />
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={populationByPurok} barSize={26} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <XAxis dataKey="purok" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(11,110,79,0.06)" }} />
                    <Bar dataKey="count" fill="#0B6E4F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Blotter cases by status" href="/reports/blotter">
              {!loading && blotterByStatus.every((b) => b.value === 0) ? (
                <EmptyChartState failed={failed.has("blotter")} />
              ) : (
                <div className="flex items-center gap-6">
                  <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={blotterByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={70}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {blotterByStatus.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex-1 space-y-2.5">
                    {blotterByStatus.map((s) => (
                      <li key={s.name} className="flex items-center gap-2 text-[13px]">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="flex-1 text-[#4B5563] dark:text-[#D4D4D4]">{s.name}</span>
                        <span className="font-semibold tabular-nums text-[#1B2430] dark:text-white">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ChartPanel>

            <div data-tour="page-reports-certs" className="lg:col-span-2">
              <ChartPanel title={`Certificates issued in ${thisMonth}`} href="/reports/certificates">
                {!loading && certByType.length === 0 ? (
                  <EmptyChartState failed={failed.has("certificates")} />
                ) : (
                  <ul className="space-y-2.5">
                    {certByType.map((c) => (
                      <li key={c.name} className="grid grid-cols-[minmax(0,14rem)_1fr_3rem] items-center gap-3 text-[13px]">
                        <span className="truncate text-[#4B5563] dark:text-[#D4D4D4]">{c.name}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-[#F0F1F3] dark:bg-[#262626]">
                          <span
                            className="block h-full rounded-full bg-[#0B6E4F] dark:bg-[#34A37A]"
                            style={{ width: `${(c.value / maxCert) * 100}%` }}
                          />
                        </span>
                        <span className="text-right font-semibold tabular-nums text-[#1B2430] dark:text-white">{c.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartPanel>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const SECTION_TITLE = "mb-3 text-[15px] font-semibold text-[#1B2430] dark:text-white";

function ChartPanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E9EAEC] bg-white p-5 dark:border-[#262626] dark:bg-[#171717]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-[#1B2430] dark:text-white">{title}</p>
        <Link href={href} className="text-[12.5px] font-medium text-(--brand-fg) hover:underline print:hidden">
          Open report
        </Link>
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E9EAEC] bg-white px-3 py-2 shadow-lg dark:border-[#262626] dark:bg-[#171717]">
      <p className="text-[12px] font-semibold text-[#1F2937] dark:text-white">{label}</p>
      <p className="text-[12px] text-[#0B6E4F] dark:text-[#34A37A]">{payload[0]?.value} residents</p>
    </div>
  );
}

function EmptyChartState({ failed = false }: { failed?: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
      {failed ? "Couldn’t load this chart. See the message above." : "No data for this period yet."}
    </div>
  );
}