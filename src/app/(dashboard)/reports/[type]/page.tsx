// FILE: src/app/(dashboard)/reports/[type]/page.tsx
//
// One page for every report defined in src/lib/reports/definitions.ts:
// Summary of Requests, Households, Health, Deaths, Officials, Visitors,
// Meetings, Barangay IDs and Barangay Finance. (The original six reports
// keep their own pages under /reports/population, /reports/certificates…,
// which take priority over this dynamic route.)
//
// Shows the headline figures, charts and tables from GET /api/reports/[type],
// with a year/month picker, and "Export PDF" downloads the same data from
// GET /api/pdf/report/[type].
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { ReportData } from "@/lib/reports/definitions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PALETTE = ["#2348B0", "#0B6E4F", "#B45309", "#B3261E", "#6D4AFF", "#0E7490", "#9D174D", "#6B7280"];
/** Reports that describe "as of today" and have no period to pick. */
const NO_PERIOD = new Set(["households", "officials"]);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E9EAEC] bg-white p-5 dark:border-[#262626] dark:bg-[#171717]">
      <h2 className="mb-4 text-[14px] font-semibold text-[#1B2430] dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E9EAEC] bg-white px-3 py-2 text-[11px] shadow-lg dark:border-[#262626] dark:bg-[#171717]">
      <p className="font-bold text-[#1B2430] dark:text-white">{label ?? payload[0].name}</p>
      <p className="text-[#2348B0] dark:text-[#8FB0FF]">{payload[0].value.toLocaleString("en-PH")}</p>
    </div>
  );
}

export default function DefinedReportPage() {
  const router = useRouter();
  const { type } = useParams<{ type: string }>();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState<number | "">("");
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");

  const query = `year=${year}${month ? `&month=${month}` : ""}`;
  const key = `${type}?${query}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports/${type}?${query}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.stats) throw new Error(res.status === 404 ? "This report doesn't exist." : body?.message || "Couldn't load the report.");
        return body as ReportData;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load the report.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(`${type}?${query}`);
      });
    return () => {
      cancelled = true;
    };
  }, [type, query]);

  const selectClass =
    "rounded-xl border border-[#E9EAEC] bg-white px-3 py-2 text-[12px] text-[#1F2937] focus:border-(--brand-line) focus:outline-none dark:border-[#262626] dark:bg-[#171717] dark:text-white";

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/reports")}
              aria-label="Back to reports"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
            >
              <ArrowLeft size={18} className="text-[#6B7280] dark:text-[#A3A3A3]" />
            </button>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight text-[#1F2937] dark:text-white">{data?.title ?? "Report"}</h1>
              <p className="mt-0.5 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
                {data ? `${data.description} · ${data.periodLabel}` : " "}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {!NO_PERIOD.has(type) && (
              <>
                <select value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")} className={selectClass} aria-label="Month">
                  <option value="">Whole year</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass} aria-label="Year">
                  {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}
            {/* Processing Time: every request, with a column for the manual timings (Nov 2026). */}
            {type === "processing" && (
              <a
                href={`/api/reports/processing/export?${query}`}
                className="flex items-center gap-2 rounded-xl border border-[#E9EAEC] bg-white px-4 py-2 text-[12px] font-bold text-[#1F2937] transition hover:bg-[#F4F5F7] dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:hover:bg-[#1F1F1F]"
              >
                <FileSpreadsheet size={13} /> Export Excel
              </a>
            )}
            <a
              href={`/api/pdf/report/${type}?${query}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-(--brand) px-4 py-2 text-[12px] font-bold text-white transition hover:bg-(--brand-hover)"
            >
              <Download size={13} /> Export PDF
            </a>
          </div>
        </div>
        <div className="mt-5 h-px bg-[#E9EAEC] dark:bg-[#262626]" />
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B91C1C] dark:border-[#7F1D1D] dark:bg-[#2A1212] dark:text-[#FCA5A5]">
          <AlertTriangle size={15} /> {error}
        </p>
      ) : loading && !data ? (
        <div className="flex justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
        </div>
      ) : data ? (
        <div className={`flex flex-col gap-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.stats.map((st) => (
              <div key={st.label} className="rounded-xl border border-[#E9EAEC] bg-white px-4 py-3.5 dark:border-[#262626] dark:bg-[#171717]">
                <p className="text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">{st.label}</p>
                <p className="mt-1 text-[24px] font-semibold leading-tight tabular-nums text-[#1F2937] dark:text-white">{st.value}</p>
                {st.hint && <p className="text-[11px] text-[#9CA3AF]">{st.hint}</p>}
              </div>
            ))}
          </div>

          {data.charts.length > 0 && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {data.charts.map((chart) => (
                <Card key={chart.title} title={chart.title}>
                  {chart.data.every((d) => d.value === 0) ? (
                    <p className="py-10 text-center text-[12px] text-[#9CA3AF]">Nothing recorded for this period.</p>
                  ) : chart.kind === "bar" ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chart.data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={0} angle={chart.data.length > 12 ? -45 : 0} textAnchor={chart.data.length > 12 ? "end" : "middle"} height={chart.data.length > 12 ? 40 : 24} />
                        <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(35,72,176,0.06)" }} />
                        <Bar dataKey="value" fill="#2348B0" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="h-44 w-44 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={chart.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={1}>
                              {chart.data.map((_, i) => (
                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="min-w-0 flex-1 space-y-1.5">
                        {chart.data.map((d, i) => (
                          <li key={d.name} className="flex items-center gap-2 text-[12px] text-[#374151] dark:text-[#D4D4D4]">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="min-w-0 flex-1 truncate">{d.name}</span>
                            <span className="font-semibold">{d.value.toLocaleString("en-PH")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {data.tables.map((table) => (
            <Card key={table.title} title={table.title}>
              {table.rows.length === 0 ? (
                <p className="py-4 text-[12px] text-[#9CA3AF]">Nothing recorded for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#E9EAEC] dark:border-[#262626]">
                        {table.columns.map((c) => (
                          <th key={c.header} className={`px-3 py-2 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3] ${c.align === "right" ? "text-right" : ""}`}>
                            {c.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, i) => (
                        <tr key={i} className={`border-b border-[#F4F5F7] last:border-0 dark:border-[#262626] ${row[0] === "Total" ? "font-bold" : ""}`}>
                          {row.map((cell, j) => (
                            <td key={j} className={`px-3 py-2 text-[#1F2937] dark:text-[#E5E7EB] ${table.columns[j]?.align === "right" ? "text-right tabular-nums" : ""}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {table.note && <p className="mt-2 text-[11px] text-[#9CA3AF]">{table.note}</p>}
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}