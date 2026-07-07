"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Download, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  total:     30,
  filed:     3,
  ongoing:   5,
  resolved:  18,
  dismissed: 4,
  escalated: 2,
  byMonth: [
    { month: "Jan", filed: 4, resolved: 3 },
    { month: "Feb", filed: 6, resolved: 5 },
    { month: "Mar", filed: 3, resolved: 4 },
    { month: "Apr", filed: 5, resolved: 3 },
    { month: "May", filed: 7, resolved: 6 },
    { month: "Jun", filed: 5, resolved: 3 },
  ],
  byType: [
    { type: "Physical Altercation", count: 9 },
    { type: "Property Dispute",     count: 7 },
    { type: "Noise Complaint",      count: 6 },
    { type: "Domestic Issue",       count: 5 },
    { type: "Theft / Robbery",      count: 3 },
  ],
  recent: [
    { id: 1,  case_no: "BLT-2026-0030", complainant: "Cruz, Pedro",    respondent: "Santos, Jose",  status: "FILED",     date: "2026-06-29", escalated: false },
    { id: 2,  case_no: "BLT-2026-0029", complainant: "Reyes, Ana",     respondent: "Lopez, Maria",  status: "ONGOING",   date: "2026-06-25", escalated: true  },
    { id: 3,  case_no: "BLT-2026-0028", complainant: "Garcia, Luis",   respondent: "Dela Cruz, Ben",status: "RESOLVED",  date: "2026-06-20", escalated: false },
    { id: 4,  case_no: "BLT-2026-0027", complainant: "Flores, Rosa",   respondent: "Ramos, Carlo",  status: "DISMISSED", date: "2026-06-18", escalated: false },
    { id: 5,  case_no: "BLT-2026-0026", complainant: "Mendoza, Luz",   respondent: "Aquino, Jun",   status: "ONGOING",   date: "2026-06-15", escalated: false },
    { id: 6,  case_no: "BLT-2026-0025", complainant: "Torres, Nina",   respondent: "Villanueva, Ed",status: "RESOLVED",  date: "2026-06-10", escalated: true  },
  ],
};

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  FILED:     { bg: "bg-blue-100",  text: "text-blue-700",  dot: "bg-blue-500"  },
  ONGOING:   { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  RESOLVED:  { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  DISMISSED: { bg: "bg-gray-100",  text: "text-gray-600",  dot: "bg-gray-400"  },
};

const PIE_DATA = [
  { name: "Filed",     value: MOCK.filed,     color: "#3B82F6" },
  { name: "Ongoing",   value: MOCK.ongoing,   color: "#F59E0B" },
  { name: "Resolved",  value: MOCK.resolved,  color: "#10B981" },
  { name: "Dismissed", value: MOCK.dismissed, color: "#9CA3AF" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg text-[11px] space-y-1">
      <p className="font-bold text-[#1F2937]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["DISMISSED"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function BlotterReportPage() {
  const router = useRouter();
  const [year,  setYear]  = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("");

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [data, setData] = useState<typeof MOCK | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams({ type: "blotter" });
    if (year)  params.set("year", year);
    if (month) params.set("month", month);
    fetch(`/api/reports?${params}`)
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [year, month]);
  ─────────────────────────────────────────────────────────────────────────── */

  const data = MOCK;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Shield size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">Blotter Report</h1>
              <p className="text-[11px] text-[#9CA3AF]">Incident cases, status tracking and trends</p>
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
          {/* Real PDF generation (disabled until API/DB is wired up):
              window.open(`/api/pdf/report/${reportType}?${params}`, "_blank")
              — hits the not-yet-implemented /api/pdf/report/[type] route. */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition print:hidden"
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Status summary cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Cases",  value: data.total,     color: "text-[#1F2937]", bg: "bg-[#F4F5F7]" },
          { label: "Filed",        value: data.filed,     color: "text-[#3B82F6]", bg: "bg-blue-50"   },
          { label: "Ongoing",      value: data.ongoing,   color: "text-amber-600", bg: "bg-amber-50"  },
          { label: "Resolved",     value: data.resolved,  color: "text-green-600", bg: "bg-green-50"  },
          { label: "Escalated",    value: data.escalated, color: "text-red-500",   bg: "bg-red-50"    },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border border-[#E9EAEC] px-4 py-4 text-center ${c.bg}`}>
            <p className={`text-[28px] font-black leading-none ${c.color}`}>{c.value}</p>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* Status pie */}
        <ChartCard title="Cases by Status">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={PIE_DATA} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                  {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {PIE_DATA.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-[11px] text-[#6B7280]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1F2937]">{s.value}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{((s.value / data.total) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Monthly trend */}
        <ChartCard title="Monthly Filed vs Resolved">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.byMonth} barSize={14} barGap={4}>
              <CartesianGrid stroke="#F4F5F7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="filed"    name="Filed"    fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /><span className="text-[10px] text-[#9CA3AF]">Filed</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /><span className="text-[10px] text-[#9CA3AF]">Resolved</span></div>
          </div>
        </ChartCard>
      </div>

      {/* Incident type breakdown */}
      <ChartCard title="Incident Types" className="mb-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {data.byType.map((t, i) => {
            const colors = ["#3B82F6","#F59E0B","#10B981","#EF4444","#8B5CF6"];
            return (
              <div key={t.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[#374151]">{t.type}</span>
                  <span className="text-[12px] font-bold text-[#1F2937]">{t.count}</span>
                </div>
                <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(t.count / data.total) * 100}%`, background: colors[i % colors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Recent cases table */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Recent Cases</p>
        </div>
        <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
          {["Case No.", "Complainant", "Respondent", "Status", "Date Filed", "Flag"].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {data.recent.map((r, i) => (
          <div key={r.id} className={`grid grid-cols-[1.2fr_1.5fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
            <span className="text-[11px] font-mono font-bold text-[#3B82F6]">{r.case_no}</span>
            <span className="text-[12px] font-semibold text-[#1F2937]">{r.complainant}</span>
            <span className="text-[12px] text-[#6B7280]">{r.respondent}</span>
            <StatusBadge status={r.status} />
            <span className="text-[11px] text-[#9CA3AF]">{fmtDate(r.date)}</span>
            <span>{r.escalated && <AlertTriangle size={14} className="text-red-500" />}</span>
          </div>
        ))}
      </div>
    </div>
  );
}