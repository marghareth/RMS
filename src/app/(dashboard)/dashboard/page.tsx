import {
  Users, Home, FileText, Shield,
  Package, TrendingUp, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import Link from "next/link";

// ── MOCK DATA ──────────────────────────────────────────
const stats = [
  {
    label: "Total Residents",
    value: "2,847",
    trend: "+12.5%",
    trendUp: true,
    sub: "Trending up this month",
    desc: "Active registered residents",
    icon: Users,
    valueColor: "text-[#2563EB]",
    trendColor: "text-[#2563EB]",
    trendBg: "bg-[#EBF3FF]",
    iconBg: "bg-[#EBF3FF]",
    iconColor: "text-[#2563EB]",
  },
  {
    label: "Households",
    value: "612",
    trend: "+4.2%",
    trendUp: true,
    sub: "Growth this quarter",
    desc: "Registered households",
    icon: Home,
    valueColor: "text-[#059669]",
    trendColor: "text-[#059669]",
    trendBg: "bg-[#D1FAE5]",
    iconBg: "bg-[#D1FAE5]",
    iconColor: "text-[#059669]",
  },
  {
    label: "Active Blotter Cases",
    value: "12",
    trend: "-20%",
    trendUp: false,
    sub: "Down from last month",
    desc: "Filed and ongoing cases",
    icon: Shield,
    valueColor: "text-[#DC2626]",
    trendColor: "text-[#DC2626]",
    trendBg: "bg-[#FEE2E2]",
    iconBg: "bg-[#FEE2E2]",
    iconColor: "text-[#DC2626]",
  },
  {
    label: "Certs This Month",
    value: "48",
    trend: "+12.5%",
    trendUp: true,
    sub: "Strong issuance rate",
    desc: "Certificates issued June 2026",
    icon: FileText,
    valueColor: "text-[#D97706]",
    trendColor: "text-[#D97706]",
    trendBg: "bg-[#FEF3C7]",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#D97706]",
  },
  {
    label: "Borrowed Equipment",
    value: "3",
    trend: "+4.5%",
    trendUp: true,
    sub: "Steady borrowing rate",
    desc: "Items currently out",
    icon: Package,
    valueColor: "text-[#D97706]",
    trendColor: "text-[#D97706]",
    trendBg: "bg-[#FEF3C7]",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#D97706]",
  },
  {
    label: "Certs This Year",
    value: "384",
    trend: "+8.1%",
    trendUp: true,
    sub: "Meets service targets",
    desc: "Total issued in 2026",
    icon: TrendingUp,
    valueColor: "text-[#2563EB]",
    trendColor: "text-[#2563EB]",
    trendBg: "bg-[#EBF3FF]",
    iconBg: "bg-[#EBF3FF]",
    iconColor: "text-[#2563EB]",
  },
];

const recentBlotter = [
  { id: 1, case_number: "BLT-2026-1042", complainant: "Juan Santos",   respondent: "Pedro Cruz",    status: "ONGOING"  },
  { id: 2, case_number: "BLT-2026-1041", complainant: "Maria Reyes",   respondent: "Ana Gomez",     status: "FILED"    },
  { id: 3, case_number: "BLT-2026-1039", complainant: "Jose Bautista", respondent: "Luis Dela Cruz", status: "RESOLVED" },
];

const recentActivity = [
  { id: 1, action: "New resident added",             module: "RBI",         user: "Secretary", time: "2 min ago"  },
  { id: 2, action: "Certificate issued (Residency)", module: "Certificate", user: "Encoder",   time: "15 min ago" },
  { id: 3, action: "Blotter case filed",             module: "Blotter",     user: "Secretary", time: "1 hr ago"   },
  { id: 4, action: "Equipment borrowed",             module: "Inventory",   user: "Admin",     time: "2 hrs ago"  },
  { id: 5, action: "Resident archived",              module: "RBI",         user: "Secretary", time: "3 hrs ago"  },
];

const blotterStatus: Record<string, { dot: string; text: string; label: string }> = {
  FILED:     { dot: "bg-[#2563EB]", text: "text-[#2563EB]", label: "Filed"     },
  ONGOING:   { dot: "bg-[#D97706]", text: "text-[#D97706]", label: "Ongoing"   },
  RESOLVED:  { dot: "bg-[#059669]", text: "text-[#059669]", label: "Resolved"  },
  DISMISSED: { dot: "bg-[#6B7280]", text: "text-[#6B7280]", label: "Dismissed" },
};
// ──────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">

      {/* Page header */}
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1F2937]">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-[#9CA3AF]">
          Barangay Quisol · Danao City, Cebu · June 30, 2026
        </p>
      </div>

      {/* Stat cards grid — 2 cols */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex flex-col gap-4 rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              {/* Top: label + trend */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className={`text-4xl font-bold leading-none ${s.valueColor}`}>
                    {s.value}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${s.trendBg} ${s.trendColor}`}
                >
                  {s.trendUp
                    ? <ArrowUpRight size={12} />
                    : <ArrowDownRight size={12} />
                  }
                  {s.trend}
                </span>
              </div>

              {/* Bottom: sub text + icon */}
              <div className="flex items-center justify-between pt-4 border-t border-[#F4F5F7]">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium text-[#374151]">{s.sub}</p>
                  <p className="text-xs text-[#9CA3AF]">{s.desc}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-4 ${s.iconBg}`}>
                  <Icon size={18} className={s.iconColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Recent Blotter */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-[#1F2937]">Recent Blotter Cases</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Latest filed and ongoing cases</p>
            </div>
            <Link
              href="/blotter"
              className="flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:text-[#2563EB] transition shrink-0 mt-0.5"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col divide-y divide-[#F4F5F7]">
            {recentBlotter.map((b) => {
              const s = blotterStatus[b.status];
              return (
                <div key={b.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1F2937] truncate">{b.case_number}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">
                      {b.complainant} vs {b.respondent}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold shrink-0 ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[#1F2937]">Recent Activity</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Latest actions across all modules</p>
          </div>

          <div className="flex flex-col divide-y divide-[#F4F5F7]">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F2937] leading-snug">{a.action}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{a.user} · {a.time}</p>
                </div>
                <span className="text-[11px] font-semibold bg-[#F4F5F7] text-[#6B7280] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                  {a.module}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}