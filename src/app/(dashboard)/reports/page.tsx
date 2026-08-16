// FILE: src/app/(dashboard)/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FileText, Shield, Wallet,
  Package, BookOpen,
  ChevronRight, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

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

  useEffect(() => {
    let cancelled = false;

    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    async function load() {
      const [dashboardRes, certsRes, blotterRes, financialRes, inventoryRes, registriesRes, puroksRes] =
        await Promise.all([
          fetch("/api/dashboard"),
          fetch(`/api/reports?type=certificates&year=${currentYear}&month=${currentMonth}`),
          fetch("/api/reports?type=blotter"),
          fetch(`/api/reports?type=financial&year=${currentYear}&month=${currentMonth}`),
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

      const income = financial.totalIncome ?? 0;
      const expense = financial.totalExpense ?? 0;

      const seniorCount = registries.seniors?.total ?? 0;
      const pwdCount = registries.pwd?.total ?? 0;
      const fourPsCount = registries.fourPs?.total ?? 0;

      setSummary({
        totalResidents: dashboard.totalResidents ?? 0,
        certificatesMonth: certs.totalThisMonth ?? 0,
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
          .map((c: { type: string; count: number }) => ({
            name: c.type,
            value: c.count,
          }))
          .sort((a: CertDatum, b: CertDatum) => b.value - a.value)
          .slice(0, 5)
      );

      setBlotterByStatus(
        (["FILED", "ONGOING", "RESOLVED", "DISMISSED"] as const)
          .map((status) => ({
            name: BLOTTER_STATUS_LABELS[status],
            value: blotter[status.toLowerCase() as "filed" | "ongoing" | "resolved" | "dismissed"] ?? 0,
            color: BLOTTER_STATUS_COLORS[status],
          }))
          .filter((b) => b.value > 0)
      );

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const netBalance = summary.monthlyIncome - summary.monthlyExpense;

  function handleExportAll() {
    setExporting(true);
    const year = String(now.getFullYear());
    EXPORTABLE_REPORT_TYPES.forEach((type) => {
      window.open(`/api/pdf/report/${type}?year=${year}`, "_blank");
    });
    setExporting(false);
  }

  const REPORT_MODULES = [
    {
      key: "population", label: "Population Report",
      description: "Residents by purok, sex, age group & civil status",
      icon: Users, accent: "text-[#3E5C76] dark:text-[#8FB0CC]",
      stat: `${summary.totalResidents.toLocaleString()} residents`,
    },
    {
      key: "certificates", label: "Certificate Report",
      description: "Issuance history by type, month & year",
      icon: FileText, accent: "text-[#0B6E4F] dark:text-[#34A37A]",
      stat: `${summary.certificatesMonth} issued this month`,
    },
    {
      key: "blotter", label: "Blotter Report",
      description: "Case status, escalations & incident trends",
      icon: Shield, accent: "text-[#B45309] dark:text-[#FBBF24]",
      stat: `${summary.activeBlotter} active cases`,
    },
    {
      key: "financial", label: "Financial Report",
      description: "Income vs. expense summary by period",
      icon: Wallet, accent: "text-[#6D4AFF] dark:text-[#A78BFA]",
      stat: `${formatCurrency(netBalance)} net`,
    },
    {
      key: "inventory", label: "Inventory Report",
      description: "Equipment status, borrowings & year-end count",
      icon: Package, accent: "text-[#B3261E] dark:text-[#F87171]",
      stat: `${summary.totalEquipment} total items`,
    },
    {
      key: "registries", label: "Special Registries",
      description: "Senior citizens, PWD, and 4Ps per purok",
      icon: BookOpen, accent: "text-[#0E7490] dark:text-[#22D3EE]",
      stat: `${summary.seniorCitizens + summary.pwdCount + summary.fourPsCount} registered`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        subtitle={`Overview as of ${today}`}
        actions={
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] text-[#6B7280] dark:text-[#A3A3A3] text-[13px] font-bold hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            {exporting ? "Exporting…" : "Export All"}
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Residents" value={summary.totalResidents.toLocaleString()} icon={Users} color="blue" />
        <StatCard label="Certs This Month" value={summary.certificatesMonth} icon={FileText} color="green" />
        <StatCard label="Active Blotter" value={summary.activeBlotter} icon={Shield} color="amber" />
        <StatCard label="Net Balance" value={formatCurrency(netBalance)} icon={Wallet} color="purple" />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3] mb-3">Report Modules</p>
        <div className="grid grid-cols-3 gap-4">
          {REPORT_MODULES.map(mod => (
            <ModuleCard key={mod.key} mod={mod} onClick={() => router.push(`/reports/${mod.key}`)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Population by Purok</p>
            <button onClick={() => router.push("/reports/population")} className="text-[11px] font-bold text-[#0B6E4F] dark:text-[#34A37A] hover:text-[#095c41] dark:hover:text-[#3FBB8C] transition">
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
                <Bar dataKey="count" fill="#0B6E4F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Blotter Case Status</p>
            <button onClick={() => router.push("/reports/blotter")} className="text-[11px] font-bold text-[#0B6E4F] dark:text-[#34A37A] hover:text-[#095c41] dark:hover:text-[#3FBB8C] transition">
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
                      <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">{s.name}</span>
                    </div>
                    <span className="text-[12px] font-bold tabular-nums text-[#1B2430] dark:text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
          <p className="text-[12px] font-bold uppercase tracking-widest text-[#1B2430] dark:text-white">Certificates Issued This Month</p>
          <button onClick={() => router.push("/reports/certificates")} className="text-[11px] font-bold text-[#0B6E4F] dark:text-[#34A37A] hover:text-[#095c41] dark:hover:text-[#3FBB8C] transition">
            Full Report →
          </button>
        </div>
        {!loading && certByType.length === 0 ? (
          <div className="px-5 py-6"><EmptyChartState /></div>
        ) : (
          <div className="grid grid-cols-5 divide-x divide-[#F4F5F7] dark:divide-[#262626]">
            {certByType.map(c => (
              <div key={c.name} className="px-4 py-4 text-center">
                <p className="text-[22px] font-bold tabular-nums text-[#1B2430] dark:text-white">{c.value}</p>
                <p className="text-[10px] font-semibold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide mt-0.5">{c.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCard({ mod, onClick }: { mod: { key: string; label: string; description: string; icon: any; accent: string; stat: string }; onClick: () => void }) {
  const Icon = mod.icon;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 text-left transition hover:border-[#0B6E4F]/30 dark:hover:border-[#34A37A]/40 hover:bg-[#E8F3EE]/50 dark:hover:bg-[#11321F]/60"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F7] dark:bg-[#262626]">
          <Icon size={18} className={mod.accent} />
        </div>
        <ChevronRight size={16} className="mt-1 text-[#D1D5DB] dark:text-[#525252] transition-colors group-hover:text-[#0B6E4F] dark:group-hover:text-[#34A37A]" />
      </div>
      <div>
        <p className="text-[13px] font-bold uppercase tracking-wide text-[#1B2430] dark:text-white">{mod.label}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF] dark:text-[#A3A3A3]">{mod.description}</p>
      </div>
      <p className="text-[11px] font-semibold tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{mod.stat}</p>
    </button>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#171717] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[11px] font-bold text-[#1F2937] dark:text-white">{label}</p>
      <p className="text-[11px] text-[#0B6E4F] dark:text-[#34A37A]">{payload[0]?.value} residents</p>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-40 items-center justify-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
      No data for this period yet.
    </div>
  );
}