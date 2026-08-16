"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Download, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import StatCard from "@/components/shared/StatCard";

interface InventoryItem {
  id: number;
  name: string;
  qty: number;
  status: string;
  condition: string;
  acquired: string;
  out: number;
  overdue: boolean;
}

interface BorrowTransaction {
  id: number;
  equipment: string;
  borrower: string;
  borrowed: string;
  due: string;
  returned: string | null;
  overdue: boolean;
}

interface InventoryReportData {
  total: number;
  serviceable: number;
  unserviceable: number;
  missing: number;
  currentlyOut: number;
  overdue: number;
  byStatus: { name: string; value: number; color: string }[];
  items: InventoryItem[];
  recentBorrowings: BorrowTransaction[];
}

const STATUS_CFG: Record<string, { icon: any; bg: string; text: string; dot: string }> = {
  SERVICEABLE:   { icon: CheckCircle2,  bg: "bg-green-100 dark:bg-green-500/15", text: "text-green-700 dark:text-green-400", dot: "bg-green-500 dark:bg-green-500"  },
  UNSERVICEABLE: { icon: AlertTriangle, bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500 dark:bg-amber-500"  },
  MISSING:       { icon: XCircle,       bg: "bg-red-100 dark:bg-red-500/15",   text: "text-red-700 dark:text-red-400",   dot: "bg-red-500 dark:bg-red-500"    },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5 ${className}`}>
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
      <p className="text-[#0B6E4F] dark:text-[#34A37A]">{payload[0]?.value}</p>
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

export default function InventoryReportPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=inventory&year=${year}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

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
                <Package size={18} className="text-[#B3261E] dark:text-[#F87171]" />
              </div>
              <div>
                <h1 className="text-[17px] font-bold text-[#1B2430] dark:text-white uppercase tracking-wide">Inventory Report</h1>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Equipment status and year-end inventory</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(e.target.value)}
              className="text-[12px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] bg-white dark:bg-[#171717] text-[#1F2937] dark:text-white">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
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
          <div className="grid grid-cols-5 gap-3 mb-5">
            <StatCard label="Total Items"   value={data.total}         icon={Package}       color="blue" />
            <StatCard label="Serviceable"   value={data.serviceable}   icon={CheckCircle2}  color="green" />
            <StatCard label="Unserviceable" value={data.unserviceable} icon={AlertTriangle} color="amber" />
            <StatCard label="Missing"       value={data.missing}       icon={XCircle}       color="red" />
            <StatCard label="Currently Out" value={data.currentlyOut}  icon={Clock}         color="blue" />
          </div>

          <div className="grid grid-cols-3 gap-5 mb-5">

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
                      <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-bold tabular-nums text-[#1B2430] dark:text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Quantity by Item" className="col-span-2">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.items.map(i => ({ name: i.name.split(" ")[0], qty: i.qty }))} barSize={22}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qty" fill="#0B6E4F" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Equipment Inventory List</p>
            </div>
            <div className="grid grid-cols-[2fr_0.8fr_1.2fr_1fr_1fr_0.8fr_0.6fr] gap-3 px-5 py-2.5 bg-[#F4F5F7] dark:bg-[#262626] border-b border-[#E9EAEC] dark:border-[#262626]">
              {["Item Name", "Qty", "Status", "Condition", "Date Acquired", "Currently Out", "Overdue"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {data.items.map((item, i) => (
              <div key={item.id} className={`grid grid-cols-[2fr_0.8fr_1.2fr_1fr_1fr_0.8fr_0.6fr] gap-3 px-5 py-3 border-b border-[#F4F5F7] dark:border-[#262626] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA] dark:bg-[#171717]" : ""}`}>
                <div className="flex items-center gap-2">
                  <Package size={13} className="text-[#9CA3AF] dark:text-[#A3A3A3] shrink-0" />
                  <span className="text-[12px] font-semibold text-[#1B2430] dark:text-white">{item.name}</span>
                </div>
                <span className="text-[12px] tabular-nums text-[#374151] dark:text-[#D4D4D4]">{item.qty}</span>
                <StatusBadge status={item.status} />
                <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">{item.condition}</span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{fmtDate(item.acquired)}</span>
                <span className={`text-[12px] font-bold tabular-nums ${item.out > 0 ? "text-[#1B2430] dark:text-white" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>{item.out}</span>
                <span>{item.overdue ? <AlertTriangle size={14} className="text-red-500 dark:text-red-400" /> : <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">—</span>}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Recent Borrow Transactions</p>
            </div>
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-3 px-5 py-2.5 bg-[#F4F5F7] dark:bg-[#262626] border-b border-[#E9EAEC] dark:border-[#262626]">
              {["Equipment", "Borrower", "Date Borrowed", "Due Date", "Returned", "Status"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {data.recentBorrowings.map((b, i) => (
              <div key={b.id} className={`grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-3 px-5 py-3 border-b border-[#F4F5F7] dark:border-[#262626] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA] dark:bg-[#171717]" : ""}`}>
                <span className="text-[12px] font-semibold text-[#1B2430] dark:text-white">{b.equipment}</span>
                <span className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{b.borrower}</span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{fmtDate(b.borrowed)}</span>
                <span className={`text-[11px] ${b.overdue ? "text-red-500 dark:text-red-400 font-bold" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>{fmtDate(b.due)}</span>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{fmtDate(b.returned)}</span>
                <span>
                  {b.returned
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">Returned</span>
                    : b.overdue
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">Overdue</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-[#D4D4D4]">Out</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}