"use client";

import { useRouter } from "next/navigation";
import {
  Users, FileText, Shield, Wallet,
  Package, BookOpen, TrendingUp,
  ChevronRight, Download, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── MOCK SUMMARY DATA ────────────────────────────────────────────────────────
const SUMMARY = {
  totalResidents:     1284,
  certificatesMonth:  47,
  activeBlotter:      8,
  totalEquipment:     32,
  seniorCitizens:     156,
  pwdCount:           43,
  fourPsCount:        89,
  monthlyIncome:      125000,
  monthlyExpense:     87500,
};

const POPULATION_BY_PUROK = [
  { purok: "Purok I",   count: 310 },
  { purok: "Purok II",  count: 278 },
  { purok: "Purok III", count: 342 },
  { purok: "Purok IV",  count: 198 },
  { purok: "Purok V",   count: 156 },
];

const CERT_BY_TYPE = [
  { name: "Residency",    value: 18 },
  { name: "Indigency",    value: 12 },
  { name: "Clearance",    value: 9  },
  { name: "Good Moral",   value: 5  },
  { name: "Business",     value: 3  },
];

const BLOTTER_STATUS = [
  { name: "Filed",    value: 3,  color: "#3B82F6" },
  { name: "Ongoing",  value: 5,  color: "#F59E0B" },
  { name: "Resolved", value: 18, color: "#10B981" },
  { name: "Dismissed",value: 4,  color: "#9CA3AF" },
];

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// ─── REPORT MODULES ───────────────────────────────────────────────────────────
const REPORT_MODULES = [
  {
    key:         "population",
    label:       "Population Report",
    description: "Residents by purok, sex, age group & civil status",
    icon:        Users,
    accent:      "text-[#3B82F6]",
    bg:          "bg-blue-50",
    border:      "border-blue-100",
    stat:        `${SUMMARY.totalResidents.toLocaleString()} residents`,
  },
  {
    key:         "certificates",
    label:       "Certificate Report",
    description: "Issuance history by type, month & year",
    icon:        FileText,
    accent:      "text-green-600",
    bg:          "bg-green-50",
    border:      "border-green-100",
    stat:        `${SUMMARY.certificatesMonth} issued this month`,
  },
  {
    key:         "blotter",
    label:       "Blotter Report",
    description: "Case status, escalations & incident trends",
    icon:        Shield,
    accent:      "text-amber-600",
    bg:          "bg-amber-50",
    border:      "border-amber-100",
    stat:        `${SUMMARY.activeBlotter} active cases`,
  },
  {
    key:         "financial",
    label:       "Financial Report",
    description: "Income vs. expense summary by period",
    icon:        Wallet,
    accent:      "text-purple-600",
    bg:          "bg-purple-50",
    border:      "border-purple-100",
    stat:        `₱${(SUMMARY.monthlyIncome - SUMMARY.monthlyExpense).toLocaleString()} net`,
  },
  {
    key:         "inventory",
    label:       "Inventory Report",
    description: "Equipment status, borrowings & year-end count",
    icon:        Package,
    accent:      "text-red-500",
    bg:          "bg-red-50",
    border:      "border-red-100",
    stat:        `${SUMMARY.totalEquipment} total items`,
  },
  {
    key:         "registries",
    label:       "Special Registries",
    description: "Senior citizens, PWD, and 4Ps per purok",
    icon:        BookOpen,
    accent:      "text-teal-600",
    bg:          "bg-teal-50",
    border:      "border-teal-100",
    stat:        `${SUMMARY.seniorCitizens + SUMMARY.pwdCount + SUMMARY.fourPsCount} registered`,
  },
];

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, bg }: {
  label: string; value: string | number; icon: any; accent: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={16} className={accent} />
      </div>
      <div>
        <p className="text-[20px] font-black leading-none text-[#1F2937]">{value}</p>
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── MODULE CARD ─────────────────────────────────────────────────────────────
function ModuleCard({ mod, onClick }: { mod: typeof REPORT_MODULES[0]; onClick: () => void }) {
  const Icon = mod.icon;
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border ${mod.border} p-5 text-left hover:shadow-md transition-all group flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.bg}`}>
          <Icon size={18} className={mod.accent} />
        </div>
        <ChevronRight size={16} className="text-[#D1D5DB] group-hover:text-[#3B82F6] transition-colors mt-1" />
      </div>
      <div>
        <p className="text-[13px] font-black text-[#1F2937] uppercase tracking-wide">{mod.label}</p>
        <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">{mod.description}</p>
      </div>
      <div className={`text-[11px] font-bold ${mod.accent} flex items-center gap-1`}>
        <TrendingUp size={11} />
        {mod.stat}
      </div>
    </button>
  );
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[11px] font-bold text-[#1F2937]">{label}</p>
      <p className="text-[11px] text-[#3B82F6]">{payload[0]?.value} residents</p>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Reports</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5 flex items-center gap-1.5">
            <Calendar size={12} />
            Overview as of {today}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] text-[#6B7280] text-[13px] font-bold hover:bg-[#F4F5F7] transition">
          <Download size={14} />
          Export All
        </button>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Residents"    value={SUMMARY.totalResidents.toLocaleString()} icon={Users}    accent="text-[#3B82F6]" bg="bg-blue-50"   />
        <StatCard label="Certs This Month"   value={SUMMARY.certificatesMonth}                icon={FileText} accent="text-green-600" bg="bg-green-50"  />
        <StatCard label="Active Blotter"     value={SUMMARY.activeBlotter}                    icon={Shield}   accent="text-amber-600" bg="bg-amber-50"  />
        <StatCard label="Net Balance"        value={`₱${(SUMMARY.monthlyIncome - SUMMARY.monthlyExpense).toLocaleString()}`} icon={Wallet} accent="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* ── Report modules grid ── */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-[#9CA3AF] mb-3">Report Modules</p>
        <div className="grid grid-cols-3 gap-4">
          {REPORT_MODULES.map(mod => (
            <ModuleCard key={mod.key} mod={mod} onClick={() => router.push(`/reports/${mod.key}`)} />
          ))}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Population by Purok */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#1F2937]">Population by Purok</p>
            <button onClick={() => router.push("/reports/population")} className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition">
              Full Report →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={POPULATION_BY_PUROK} barSize={28}>
              <XAxis dataKey="purok" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Blotter by Status */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#1F2937]">Blotter Case Status</p>
            <button onClick={() => router.push("/reports/blotter")} className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition">
              Full Report →
            </button>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={160}>
              <PieChart>
                <Pie data={BLOTTER_STATUS} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {BLOTTER_STATUS.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {BLOTTER_STATUS.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-[11px] text-[#6B7280]">{s.name}</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#1F2937]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Certificate breakdown mini table */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <p className="text-[12px] font-black uppercase tracking-widest text-[#1F2937]">Certificates Issued This Month</p>
          <button onClick={() => router.push("/reports/certificates")} className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition">
            Full Report →
          </button>
        </div>
        <div className="grid grid-cols-5 divide-x divide-[#F4F5F7]">
          {CERT_BY_TYPE.map(c => (
            <div key={c.name} className="px-4 py-4 text-center">
              <p className="text-[22px] font-black text-[#1F2937]">{c.value}</p>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mt-0.5">{c.name}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}