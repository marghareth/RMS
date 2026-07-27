// FILE: src/app/(dashboard)/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FileText, Shield, Wallet,
  Package, BookOpen, TrendingUp,
  ChevronRight, Download, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const CERT_TYPE_LABELS: Record<string, string> = {
  RESIDENCY: "Residency",
  INDIGENCY: "Indigency",
  CLEARANCE: "Clearance",
  GOOD_MORAL: "Good Moral",
  BUSINESS_PERMIT: "Business",
  COHABITATION: "Cohabitation",
  SOLO_PARENT: "Solo Parent",
  FIRST_TIME_JOB_SEEKER: "1st Time Job Seeker",
  LATE_REGISTRATION: "Late Registration",
};

const BLOTTER_STATUS_COLORS: Record<string, string> = {
  FILED: "#3B82F6",
  ONGOING: "#F59E0B",
  RESOLVED: "#10B981",
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

interface Summary {
  totalResidents: number;
  certificatesMonth: number;
  activeBlotter: number;
  totalEquipment: number;
  seniorCitizens: number;
  pwdCount: number;
  fourPsCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface PurokDatum { purok: string; count: number }
interface CertDatum { name: string; value: number }
interface BlotterDatum { name: string; value: number; color: string }

const EMPTY_SUMMARY: Summary = {
  totalResidents: 0, certificatesMonth: 0, activeBlotter: 0, totalEquipment: 0,
  seniorCitizens: 0, pwdCount: 0, fourPsCount: 0, monthlyIncome: 0, monthlyExpense: 0,
};

export default function ReportsPage() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [populationByPurok, setPopulationByPurok] = useState<PurokDatum[]>([]);
  const [certByType, setCertByType] = useState<CertDatum[]>([]);
  const [blotterByStatus, setBlotterByStatus] = useState<BlotterDatum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    async function load() {
      const [dashboardRes, certsRes, blotterRes, financialRes, inventoryRes, registriesRes, puroksRes] =
        await Promise.all([
          fetch("/api/dashboard"),
          fetch(`/api/reports?type=certificates&date_from=${monthStart}`),
          fetch("/api/reports?type=blotter"),
          fetch(`/api/reports?type=financial&date_from=${monthStart}`),
          fetch("/api/reports?type=inventory"),
          fetch("/api/reports?type=registries"),
          fetch("/api/puroks"),
        ]);

      const [dashboard, certs, blotter, financial, inventory, registries, puroks] = await Promise.all([
        dashboardRes.json(),
        certsRes.json(),
        blotterRes.json(),
        financialRes.json(),
        inventoryRes.json(),
        registriesRes.json(),
        puroksRes.json(),
      ]);

      if (cancelled) return;

      const purokNameById = new Map<number, string>(puroks.map((p: { id: number; name: string }) => [p.id, p.name]));

      const income = financial.find((f: { transaction_type: string }) => f.transaction_type === "INCOME")?._sum.amount ?? 0;
      const expense = financial.find((f: { transaction_type: string }) => f.transaction_type === "EXPENSE")?._sum.amount ?? 0;

      const seniorCount = registries.find((r: { registry_type: string }) => r.registry_type === "SENIOR_CITIZEN")?._count ?? 0;
      const pwdCount = registries.find((r: { registry_type: string }) => r.registry_type === "PWD")?._count ?? 0;
      const fourPsCount = registries.find((r: { registry_type: string }) => r.registry_type === "FOUR_PS")?._count ?? 0;

      setSummary({
        totalResidents: dashboard.totalResidents ?? 0,
        certificatesMonth: certs.total ?? 0,
        activeBlotter: dashboard.activeCases ?? 0,
        totalEquipment: inventory.total ?? 0,
        seniorCitizens: seniorCount,
        pwdCount,
        fourPsCount,
        monthlyIncome: income,
        monthlyExpense: expense,
      });

      setPopulationByPurok(
        (dashboard.residentsByPurok ?? [])
          .map((p: { purok_id: number | null; _count: number }) => ({
            purok: (p.purok_id != null ? purokNameById.get(p.purok_id) : null) ?? "Unassigned",
            count: p._count,
          }))
          .sort((a: PurokDatum, b: PurokDatum) => a.purok.localeCompare(b.purok))
      );

      setCertByType(
        (certs.byType ?? [])
          .map((c: { certificate_type: string; _count: number }) => ({
            name: CERT_TYPE_LABELS[c.certificate_type] ?? c.certificate_type,
            value: c._count,
          }))
          .sort((a: CertDatum, b: CertDatum) => b.value - a.value)
          .slice(0, 5)
      );

      setBlotterByStatus(
        (blotter.byStatus ?? []).map((b: { status: string; _count: number }) => ({
          name: BLOTTER_STATUS_LABELS[b.status] ?? b.status,
          value: b._count,
          color: BLOTTER_STATUS_COLORS[b.status] ?? "#9CA3AF",
        }))
      );

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const netBalance = summary.monthlyIncome - summary.monthlyExpense;

  const REPORT_MODULES = [
    {
      key: "population", label: "Population Report",
      description: "Residents by purok, sex, age group & civil status",
      icon: Users, accent: "text-[#3B82F6]", bg: "bg-blue-50", border: "border-blue-100",
      stat: `${summary.totalResidents.toLocaleString()} residents`,
    },
    {
      key: "certificates", label: "Certificate Report",
      description: "Issuance history by type, month & year",
      icon: FileText, accent: "text-green-600", bg: "bg-green-50", border: "border-green-100",
      stat: `${summary.certificatesMonth} issued this month`,
    },
    {
      key: "blotter", label: "Blotter Report",
      description: "Case status, escalations & incident trends",
      icon: Shield, accent: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100",
      stat: `${summary.activeBlotter} active cases`,
    },
    {
      key: "financial", label: "Financial Report",
      description: "Income vs. expense summary by period",
      icon: Wallet, accent: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100",
      stat: `${formatCurrency(netBalance)} net`,
    },
    {
      key: "inventory", label: "Inventory Report",
      description: "Equipment status, borrowings & year-end count",
      icon: Package, accent: "text-red-500", bg: "bg-red-50", border: "border-red-100",
      stat: `${summary.totalEquipment} total items`,
    },
    {
      key: "registries", label: "Special Registries",
      description: "Senior citizens, PWD, and 4Ps per purok",
      icon: BookOpen, accent: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100",
      stat: `${summary.seniorCitizens + summary.pwdCount + summary.fourPsCount} registered`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
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

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Residents" value={summary.totalResidents.toLocaleString()} icon={Users} accent="text-[#3B82F6]" bg="bg-blue-50" />
        <StatCard label="Certs This Month" value={summary.certificatesMonth} icon={FileText} accent="text-green-600" bg="bg-green-50" />
        <StatCard label="Active Blotter" value={summary.activeBlotter} icon={Shield} accent="text-amber-600" bg="bg-amber-50" />
        <StatCard label="Net Balance" value={formatCurrency(netBalance)} icon={Wallet} accent="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Report modules grid */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-[#9CA3AF] mb-3">Report Modules</p>
        <div className="grid grid-cols-3 gap-4">
          {REPORT_MODULES.map(mod => (
            <ModuleCard key={mod.key} mod={mod} onClick={() => router.push(`/reports/${mod.key}`)} />
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Population by Purok */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#1F2937]">Population by Purok</p>
            <button onClick={() => router.push("/reports/population")} className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition">
              Full Report →
            </button>
          </div>
          {!loading && populationByPurok.length === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={populationByPurok} barSize={28}>
                <XAxis dataKey="purok" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Blotter by Status */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#1F2937]">Blotter Case Status</p>
            <button onClick={() => router.push("/reports/blotter")} className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition">
              Full Report →
            </button>
          </div>
          {!loading && blotterByStatus.every(b => b.value === 0) ? (
            <EmptyChartState />
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
                      <span className="text-[11px] text-[#6B7280]">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-bold text-[#1F2937]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        {!loading && certByType.length === 0 ? (
          <div className="px-5 py-6"><EmptyChartState /></div>
        ) : (
          <div className="grid grid-cols-5 divide-x divide-[#F4F5F7]">
            {certByType.map(c => (
              <div key={c.name} className="px-4 py-4 text-center">
                <p className="text-[22px] font-black text-[#1F2937]">{c.value}</p>
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mt-0.5">{c.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

function ModuleCard({ mod, onClick }: { mod: { key: string; label: string; description: string; icon: any; accent: string; bg: string; border: string; stat: string }; onClick: () => void }) {
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[11px] font-bold text-[#1F2937]">{label}</p>
      <p className="text-[11px] text-[#3B82F6]">{payload[0]?.value} residents</p>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-40 items-center justify-center text-[12px] text-[#9CA3AF]">
      No data for this period yet.
    </div>
  );
}