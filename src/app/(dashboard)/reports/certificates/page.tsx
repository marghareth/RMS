"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download, CalendarRange, CalendarDays, Layers } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import StatCard from "@/components/shared/StatCard";

interface CertificateTypeCount {
  type: string;
  count: number;
  color: string;
}

interface CertificateIssuance {
  id: number;
  resident: string;
  type: string;
  purpose: string;
  issued_at: string;
  issuer: string;
}

interface CertificatesReportData {
  totalThisYear: number;
  totalThisMonth: number;
  byType: CertificateTypeCount[];
  byMonth: { month: string; count: number }[];
  recent: CertificateIssuance[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white mb-4">{title}</p>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#171717] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 shadow-lg text-[11px]">
      <p className="font-bold text-[#1B2430] dark:text-white">{label ?? payload[0]?.name}</p>
      <p className="text-[#0B6E4F] dark:text-[#34A37A]">{payload[0]?.value} certificates</p>
    </div>
  );
}

const TYPE_BG: Record<string, string> = {
  "Residency":             "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "Indigency":             "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400",
  "Clearance":             "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Good Moral":            "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "Business Permit":       "bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "Cohabitation":          "bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "Solo Parent":           "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
  "First Time Job Seeker": "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "Late Registration":     "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-[#D4D4D4]",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_BG[type] ?? "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-[#D4D4D4]";
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>{type}</span>;
}

export default function CertificatesReportPage() {
  const router = useRouter();
  const [year,  setYear]  = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("");

  const [data, setData] = useState<CertificatesReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "certificates" });
      if (year)  params.set("year", year);
      if (month) params.set("month", month);
      const res = await fetch(`/api/reports?${params}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

  const total = data ? data.byType.reduce((s, t) => s + t.count, 0) : 0;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition">
              <ArrowLeft size={18} className="text-[#6B7280] dark:text-[#A3A3A3]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4F5F7] dark:bg-[#262626] flex items-center justify-center">
                <FileText size={18} className="text-[#0B6E4F] dark:text-[#34A37A]" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-[#1B2430] dark:text-white uppercase tracking-wide">Certificate Report</h1>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Issuance history and breakdown by type</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(e.target.value)}
              className="text-[12px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] bg-white dark:bg-[#171717] text-[#1F2937] dark:text-white">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="text-[12px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] bg-white dark:bg-[#171717] text-[#1F2937] dark:text-white">
              <option value="">All Months</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
              ))}
            </select>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] transition print:hidden"
            >
              <Download size={13} /> Export PDF
            </button>
          </div>
        </div>
        <div className="mt-4 h-px bg-[#1B2430] dark:bg-[#E5E7EB]" />
        <div className="mt-0.75 h-px bg-[#E9EAEC] dark:bg-[#262626]" />
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <StatCard label="Total This Year" value={data.totalThisYear} icon={CalendarRange} color="blue" />
            <StatCard label="This Month" value={data.totalThisMonth} icon={CalendarDays} color="green" />
            <StatCard label="Certificate Types" value={data.byType.length} icon={Layers} color="purple" />
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">

            <ChartCard title="Issuance by Type">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byType} layout="vertical" barSize={16} margin={{ left: 90 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data.byType.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={`Monthly Trend (${year})`}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.byMonth} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Type Breakdown">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {data.byType.map(t => (
                <div key={t.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#374151] dark:text-[#D4D4D4]">{t.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold tabular-nums text-[#1B2430] dark:text-white">{t.count}</span>
                      <span className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">{total ? ((t.count / total) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F4F5F7] dark:bg-[#262626] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${total ? (t.count / total) * 100 : 0}%`, background: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <div className="mt-5 bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Recent Issuances</p>
            </div>
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] dark:bg-[#262626] border-b border-[#E9EAEC] dark:border-[#262626]">
              {["Resident", "Type", "Purpose", "Date", "Issued By"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {data.recent.map((r, i) => (
              <div key={r.id} className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] dark:border-[#262626] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA] dark:bg-[#171717]" : ""}`}>
                <span className="text-[12px] font-semibold text-[#1B2430] dark:text-white">{r.resident}</span>
                <TypeBadge type={r.type} />
                <span className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{r.purpose}</span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{fmtDate(r.issued_at)}</span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{r.issuer}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}