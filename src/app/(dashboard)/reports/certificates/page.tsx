"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Cell,
} from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  totalThisYear:  284,
  totalThisMonth: 47,
  byType: [
    { type: "Residency",              count: 98,  color: "#3B82F6" },
    { type: "Indigency",              count: 67,  color: "#10B981" },
    { type: "Clearance",              count: 54,  color: "#F59E0B" },
    { type: "Good Moral",             count: 29,  color: "#8B5CF6" },
    { type: "Business Permit",        count: 18,  color: "#EC4899" },
    { type: "Cohabitation",           count: 8,   color: "#06B6D4" },
    { type: "Solo Parent",            count: 5,   color: "#EF4444" },
    { type: "First Time Job Seeker",  count: 4,   color: "#F97316" },
    { type: "Late Registration",      count: 1,   color: "#6B7280" },
  ],
  byMonth: [
    { month: "Jan", count: 18 },
    { month: "Feb", count: 22 },
    { month: "Mar", count: 31 },
    { month: "Apr", count: 25 },
    { month: "May", count: 29 },
    { month: "Jun", count: 47 },
  ],
  recent: [
    { id: 1,  resident: "dela Cruz, Juan",     type: "Residency",    purpose: "Employment",  issued_at: "2026-06-30", issuer: "secretary1" },
    { id: 2,  resident: "Santos, Maria",        type: "Indigency",    purpose: "Medical",     issued_at: "2026-06-30", issuer: "secretary1" },
    { id: 3,  resident: "Reyes, Rosa",          type: "Clearance",    purpose: "NBI",         issued_at: "2026-06-29", issuer: "encoder1"   },
    { id: 4,  resident: "Garcia, Pedro",        type: "Good Moral",   purpose: "School",      issued_at: "2026-06-29", issuer: "secretary1" },
    { id: 5,  resident: "Flores, Ana",          type: "Residency",    purpose: "Travel",      issued_at: "2026-06-28", issuer: "encoder1"   },
    { id: 6,  resident: "Lopez, Carmen",        type: "Business Permit","purpose":"Renewal",  issued_at: "2026-06-28", issuer: "secretary1" },
    { id: 7,  resident: "Cruz, Fernando",       type: "Indigency",    purpose: "Medical",     issued_at: "2026-06-27", issuer: "encoder1"   },
    { id: 8,  resident: "Mendoza, Lourdes",     type: "Residency",    purpose: "Employment",  issued_at: "2026-06-27", issuer: "secretary1" },
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
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
      <p className="text-[#3B82F6]">{payload[0]?.value} certificates</p>
    </div>
  );
}

// ─── TYPE BADGE ───────────────────────────────────────────────────────────────
const TYPE_BG: Record<string, string> = {
  "Residency":             "bg-blue-100 text-blue-700",
  "Indigency":             "bg-green-100 text-green-700",
  "Clearance":             "bg-amber-100 text-amber-700",
  "Good Moral":            "bg-purple-100 text-purple-700",
  "Business Permit":       "bg-pink-100 text-pink-700",
  "Cohabitation":          "bg-cyan-100 text-cyan-700",
  "Solo Parent":           "bg-red-100 text-red-700",
  "First Time Job Seeker": "bg-orange-100 text-orange-700",
  "Late Registration":     "bg-gray-100 text-gray-700",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_BG[type] ?? "bg-gray-100 text-gray-700";
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>{type}</span>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CertificatesReportPage() {
  const router = useRouter();
  const [year,  setYear]  = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("");

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [data, setData] = useState<typeof MOCK | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams({ type: "certificates" });
    if (year)  params.set("date_from", `${year}-01-01`);
    if (month) params.set("date_from", `${year}-${month}-01`);
    fetch(`/api/reports?${params}`)
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [year, month]);
  ─────────────────────────────────────────────────────────────────────────── */

  const data = MOCK;
  const total = data.byType.reduce((s, t) => s + t.count, 0);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <FileText size={18} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">Certificate Report</h1>
              <p className="text-[11px] text-[#9CA3AF]">Issuance history and breakdown by type</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            <option value="">All Months</option>
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Total This Year",  value: data.totalThisYear,  color: "text-[#3B82F6]" },
          { label: "This Month",       value: data.totalThisMonth, color: "text-green-600" },
          { label: "Certificate Types",value: data.byType.length,  color: "text-purple-600" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-[#E9EAEC] px-5 py-4">
            <p className={`text-[30px] font-black leading-none ${c.color}`}>{c.value}</p>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* By Type bar chart */}
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

        {/* Monthly trend */}
        <ChartCard title="Monthly Trend (Jan – Jun 2026)">
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

      {/* Type breakdown progress bars */}
      <ChartCard title="Type Breakdown">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {data.byType.map(t => (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[#374151]">{t.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[#1F2937]">{t.count}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{((t.count / total) * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(t.count / total) * 100}%`, background: t.color }} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Recent issuances table */}
      <div className="mt-5 bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Recent Issuances</p>
        </div>
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
          {["Resident", "Type", "Purpose", "Date", "Issued By"].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {data.recent.map((r, i) => (
          <div key={r.id} className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
            <span className="text-[12px] font-semibold text-[#1F2937]">{r.resident}</span>
            <TypeBadge type={r.type} />
            <span className="text-[12px] text-[#6B7280]">{r.purpose}</span>
            <span className="text-[11px] text-[#9CA3AF]">{fmtDate(r.issued_at)}</span>
            <span className="text-[11px] text-[#9CA3AF]">{r.issuer}</span>
          </div>
        ))}
      </div>
    </div>
  );
}