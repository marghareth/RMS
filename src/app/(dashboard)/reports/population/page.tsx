"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useReportData } from "@/lib/hooks/useReportData";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface PurokCount {
  purok: string;
  count: number;
  households: number;
}

interface PopulationReportData {
  total: number;
  byPurok: PurokCount[];
  bySex: { sex: string; count: number }[];
  byAgeGroup: { group: string; count: number }[];
  byCivilStatus: { status: string; count: number }[];
  byEmployment: { status: string; count: number }[];
}

const SEX_COLORS   = ["#3B82F6", "#EC4899"];
const AGE_COLORS   = ["#6366F1", "#3B82F6", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];
const CIVIL_COLORS = ["#3B82F6", "#10B981", "#6B7280", "#F59E0B", "#EC4899"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function pct(n: number, total: number) { return total ? ((n / total) * 100).toFixed(1) + "%" : "0.0%"; }

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
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg text-[11px]">
      <p className="font-bold text-[#1F2937]">{label ?? payload[0]?.name}</p>
      <p className="text-[#3B82F6]">{payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PopulationReportPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const { data, loading } = useReportData<PopulationReportData>("population", { year });

  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    if (!data) return; // guard: PopulationReportPDF requires non-null data
    setExporting(true);
    try {
      const { default: PopulationReportPDF } = await import("@/lib/pdf/PopulationReportPDF");
      const { downloadPdf } = await import("@/lib/pdf/generatePdf");
      await downloadPdf(
        <PopulationReportPDF data={data} year={year} />,
        `population-report-${year}.pdf`
      );
    } catch (e) {
      console.error("Failed to generate PDF", e);
      alert("Something went wrong while generating the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={18} className="text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">Population Report</h1>
              <p className="text-[11px] text-[#9CA3AF]">Resident demographics and distribution</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleExportPdf}
            disabled={exporting || loading || !data}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition disabled:opacity-60 print:hidden"
          >
            <Download size={13} /> {exporting ? "Generating..." : "Export PDF"}
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ── Total banner ── */}
          <div className="bg-[#3B82F6] rounded-xl px-6 py-5 mb-5 flex items-center justify-between text-white">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Total Registered Residents</p>
              <p className="text-[42px] font-black leading-none mt-1">{data.total.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className="flex gap-6">
                {data.bySex.map(s => (
                  <div key={s.sex}>
                    <p className="text-[26px] font-black leading-none">{s.count}</p>
                    <p className="text-[11px] opacity-80 uppercase font-semibold">{s.sex}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">

            {/* Population by Purok */}
            <ChartCard title="Population by Purok">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byPurok} barSize={30}>
                  <XAxis dataKey="purok" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {data.byPurok.map(p => (
                  <div key={p.purok} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6B7280] min-w-20">{p.purok}</span>
                    <div className="flex-1 h-1.5 bg-[#F4F5F7] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: pct(p.count, data.total) }} />
                    </div>
                    <span className="text-[11px] font-bold text-[#1F2937] min-w-9 text-right">{p.count}</span>
                    <span className="text-[10px] text-[#9CA3AF] min-w-9">{pct(p.count, data.total)}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Age Distribution */}
            <ChartCard title="Age Group Distribution">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byAgeGroup} barSize={26}>
                  <XAxis dataKey="group" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.byAgeGroup.map((_, i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {data.byAgeGroup.map((g, i) => (
                  <div key={g.group} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: AGE_COLORS[i] }} />
                    <span className="text-[10px] text-[#6B7280]">{g.group}: <strong className="text-[#1F2937]">{g.count}</strong></span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Civil Status */}
            <ChartCard title="Civil Status Breakdown">
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="45%" height={160}>
                  <PieChart>
                    <Pie data={data.byCivilStatus} dataKey="count" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                      {data.byCivilStatus.map((_, i) => <Cell key={i} fill={CIVIL_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.byCivilStatus.map((c, i) => (
                    <div key={c.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CIVIL_COLORS[i] }} />
                        <span className="text-[11px] text-[#6B7280]">{c.status}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] font-bold text-[#1F2937]">{c.count}</span>
                        <span className="text-[10px] text-[#9CA3AF] ml-1">{pct(c.count, data.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            {/* Employment */}
            <ChartCard title="Employment Status">
              <div className="space-y-3">
                {data.byEmployment.map((e, i) => (
                  <div key={e.status} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6B7280] min-w-25">{e.status}</span>
                    <div className="flex-1 h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct(e.count, data.total), background: AGE_COLORS[i % AGE_COLORS.length] }} />
                    </div>
                    <span className="text-[12px] font-bold text-[#1F2937] min-w-9 text-right">{e.count}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Purok detail table */}
          <ChartCard title="Household Count by Purok">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-0">
              {["Purok", "Residents", "Households", "Avg / HH"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide py-2 border-b border-[#F4F5F7]">{h}</span>
              ))}
              {data.byPurok.map((p) => (
                <Fragment key={p.purok}>
                  <span className="text-[12px] font-semibold text-[#1F2937] py-3 border-b border-[#F9FAFB]">{p.purok}</span>
                  <span className="text-[12px] text-[#374151] py-3 border-b border-[#F9FAFB]">{p.count}</span>
                  <span className="text-[12px] text-[#374151] py-3 border-b border-[#F9FAFB]">{p.households}</span>
                  <span className="text-[12px] text-[#374151] py-3 border-b border-[#F9FAFB]">{p.households ? (p.count / p.households).toFixed(1) : "—"}</span>
                </Fragment>
              ))}
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}