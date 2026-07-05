"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Download, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  total:         8,
  serviceable:   6,
  unserviceable: 1,
  missing:       1,
  currentlyOut:  3,
  overdue:       1,
  byStatus: [
    { name: "Serviceable",   value: 6, color: "#10B981" },
    { name: "Unserviceable", value: 1, color: "#F59E0B" },
    { name: "Missing",       value: 1, color: "#EF4444" },
  ],
  items: [
    { id: 1, name: "Megaphone",       qty: 3,  status: "SERVICEABLE",   condition: "Good",        acquired: "2022-01-15", out: 1, overdue: true  },
    { id: 2, name: "Plastic Chairs",  qty: 50, status: "SERVICEABLE",   condition: "Fair",        acquired: "2021-05-10", out: 1, overdue: false },
    { id: 3, name: "Folding Tables",  qty: 10, status: "SERVICEABLE",   condition: "Good",        acquired: "2021-05-10", out: 0, overdue: false },
    { id: 4, name: "Generator",       qty: 1,  status: "UNSERVICEABLE", condition: "Needs repair",acquired: "2019-08-22", out: 0, overdue: false },
    { id: 5, name: "Tarpaulin Stand", qty: 4,  status: "SERVICEABLE",   condition: "Good",        acquired: "2023-03-01", out: 0, overdue: false },
    { id: 6, name: "Sound System",    qty: 1,  status: "SERVICEABLE",   condition: "Good",        acquired: "2022-11-12", out: 1, overdue: false },
    { id: 7, name: "Basketball Ring", qty: 2,  status: "MISSING",       condition: "Damaged",     acquired: "2020-06-15", out: 0, overdue: false },
    { id: 8, name: "First Aid Kit",   qty: 5,  status: "SERVICEABLE",   condition: "Complete",    acquired: "2024-01-08", out: 0, overdue: false },
  ],
  recentBorrowings: [
    { id: 1, equipment: "Megaphone",      borrower: "Juan dela Cruz", borrowed: "2026-06-20", due: "2026-06-27", returned: null,         overdue: true  },
    { id: 2, equipment: "Plastic Chairs", borrower: "Maria Santos",   borrowed: "2026-06-28", due: "2026-07-05", returned: null,         overdue: false },
    { id: 3, equipment: "Sound System",   borrower: "Pedro Reyes",    borrowed: "2026-06-29", due: "2026-07-01", returned: null,         overdue: false },
    { id: 5, equipment: "Megaphone",      borrower: "Maria Santos",   borrowed: "2026-05-10", due: "2026-05-15", returned: "2026-05-14", overdue: false },
    { id: 8, equipment: "Megaphone",      borrower: "Pedro Reyes",    borrowed: "2026-04-01", due: "2026-04-05", returned: "2026-04-05", overdue: false },
  ],
};

const STATUS_CFG: Record<string, { icon: any; bg: string; text: string; dot: string }> = {
  SERVICEABLE:   { icon: CheckCircle2,  bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500"  },
  UNSERVICEABLE: { icon: AlertTriangle, bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500"  },
  MISSING:       { icon: XCircle,       bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500"    },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
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
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg text-[11px]">
      <p className="font-bold text-[#1F2937]">{label ?? payload[0]?.name}</p>
      <p className="text-[#3B82F6]">{payload[0]?.value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InventoryReportPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear().toString());

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [data, setData] = useState<typeof MOCK | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/reports?type=inventory&year=${year}`)
      .then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [year]);
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
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Package size={18} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">Inventory Report</h1>
              <p className="text-[11px] text-[#9CA3AF]">Equipment status and year-end inventory</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Items",    value: data.total,         icon: Package,       color: "text-[#1F2937]", bg: "bg-[#F4F5F7]" },
          { label: "Serviceable",    value: data.serviceable,   icon: CheckCircle2,  color: "text-green-600", bg: "bg-green-50"  },
          { label: "Unserviceable",  value: data.unserviceable, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50"  },
          { label: "Missing",        value: data.missing,       icon: XCircle,       color: "text-red-500",   bg: "bg-red-50"    },
          { label: "Currently Out",  value: data.currentlyOut,  icon: Clock,         color: "text-[#3B82F6]", bg: "bg-blue-50"   },
        ].map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-xl border border-[#E9EAEC] px-4 py-4 ${c.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className={c.color} />
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">{c.label}</p>
              </div>
              <p className={`text-[26px] font-black leading-none ${c.color}`}>{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">

        {/* Status pie */}
        <ChartCard title="Status Breakdown">
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={data.byStatus} dataKey="value" cx="50%" cy="50%" outerRadius={55} paddingAngle={3}>
                {data.byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {data.byStatus.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[11px] text-[#6B7280]">{s.name}</span>
                </div>
                <span className="text-[12px] font-bold text-[#1F2937]">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Qty bar chart */}
        <ChartCard title="Quantity by Item" className="col-span-2">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.items.map(i => ({ name: i.name.split(" ")[0], qty: i.qty }))} barSize={22}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="qty" fill="#3B82F6" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Equipment inventory table */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Equipment Inventory List</p>
        </div>
        <div className="grid grid-cols-[2fr_0.8fr_1.2fr_1fr_1fr_0.8fr_0.6fr] gap-3 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
          {["Item Name", "Qty", "Status", "Condition", "Date Acquired", "Currently Out", "Overdue"].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {data.items.map((item, i) => (
          <div key={item.id} className={`grid grid-cols-[2fr_0.8fr_1.2fr_1fr_1fr_0.8fr_0.6fr] gap-3 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
            <div className="flex items-center gap-2">
              <Package size={13} className="text-[#9CA3AF] shrink-0" />
              <span className="text-[12px] font-semibold text-[#1F2937]">{item.name}</span>
            </div>
            <span className="text-[12px] text-[#374151]">{item.qty}</span>
            <StatusBadge status={item.status} />
            <span className="text-[11px] text-[#6B7280]">{item.condition}</span>
            <span className="text-[11px] text-[#9CA3AF]">{fmtDate(item.acquired)}</span>
            <span className={`text-[12px] font-bold ${item.out > 0 ? "text-[#3B82F6]" : "text-[#9CA3AF]"}`}>{item.out}</span>
            <span>{item.overdue ? <AlertTriangle size={14} className="text-red-500" /> : <span className="text-[11px] text-[#9CA3AF]">—</span>}</span>
          </div>
        ))}
      </div>

      {/* Recent borrowings */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Recent Borrow Transactions</p>
        </div>
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-3 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
          {["Equipment", "Borrower", "Date Borrowed", "Due Date", "Returned", "Status"].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {data.recentBorrowings.map((b, i) => (
          <div key={b.id} className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-3 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
            <span className="text-[12px] font-semibold text-[#1F2937]">{b.equipment}</span>
            <span className="text-[12px] text-[#6B7280]">{b.borrower}</span>
            <span className="text-[11px] text-[#9CA3AF]">{fmtDate(b.borrowed)}</span>
            <span className={`text-[11px] ${b.overdue ? "text-red-500 font-bold" : "text-[#9CA3AF]"}`}>{fmtDate(b.due)}</span>
            <span className="text-[11px] text-[#9CA3AF]">{fmtDate(b.returned)}</span>
            <span>
              {b.returned
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Returned</span>
                : b.overdue
                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Overdue</span>
                  : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Out</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}