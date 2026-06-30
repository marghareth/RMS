import {
  Users, Home, FileText, Shield,
  Package, TrendingUp, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";

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
    color: "blue",
  },
  {
    label: "Households",
    value: "612",
    trend: "+4.2%",
    trendUp: true,
    sub: "Growth this quarter",
    desc: "Registered households",
    icon: Home,
    color: "green",
  },
  {
    label: "Active Blotter Cases",
    value: "12",
    trend: "-20%",
    trendUp: false,
    sub: "Down from last month",
    desc: "Filed and ongoing cases",
    icon: Shield,
    color: "red",
  },
  {
    label: "Certs This Month",
    value: "48",
    trend: "+12.5%",
    trendUp: true,
    sub: "Strong issuance rate",
    desc: "Certificates issued June 2026",
    icon: FileText,
    color: "amber",
  },
  {
    label: "Borrowed Equipment",
    value: "3",
    trend: "+4.5%",
    trendUp: true,
    sub: "Steady borrowing rate",
    desc: "Items currently out",
    icon: Package,
    color: "amber",
  },
  {
    label: "Certs This Year",
    value: "384",
    trend: "+8.1%",
    trendUp: true,
    sub: "Meets service targets",
    desc: "Total issued in 2026",
    icon: TrendingUp,
    color: "blue",
  },
];

const recentBlotter = [
  { id: 1, case_number: "BLT-2026-1042", complainant: "Juan Santos",   respondent: "Pedro Cruz",    status: "ONGOING"  },
  { id: 2, case_number: "BLT-2026-1041", complainant: "Maria Reyes",   respondent: "Ana Gomez",     status: "FILED"    },
  { id: 3, case_number: "BLT-2026-1039", complainant: "Jose Bautista", respondent: "Luis Dela Cruz", status: "RESOLVED" },
];

const recentActivity = [
  { id: 1, action: "New resident added",            module: "RBI",         user: "Secretary", time: "2 min ago"  },
  { id: 2, action: "Certificate issued (Residency)", module: "Certificate", user: "Encoder",   time: "15 min ago" },
  { id: 3, action: "Blotter case filed",             module: "Blotter",     user: "Secretary", time: "1 hr ago"   },
  { id: 4, action: "Equipment borrowed",             module: "Inventory",   user: "Admin",     time: "2 hrs ago"  },
  { id: 5, action: "Resident archived",              module: "RBI",         user: "Secretary", time: "3 hrs ago"  },
];

const colorMap: Record<string, { icon: string; value: string; trend: string; trendBg: string }> = {
  blue:  { icon: "text-blue-500 bg-blue-50",   value: "text-blue-600",  trend: "text-blue-600",  trendBg: "bg-blue-50"  },
  green: { icon: "text-green-500 bg-green-50", value: "text-green-600", trend: "text-green-600", trendBg: "bg-green-50" },
  amber: { icon: "text-amber-500 bg-amber-50", value: "text-amber-600", trend: "text-amber-600", trendBg: "bg-amber-50" },
  red:   { icon: "text-red-500 bg-red-50",     value: "text-red-600",   trend: "text-red-600",   trendBg: "bg-red-50"   },
};
// ──────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="max-w-screen-xl mx-auto">

      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Barangay Quisol · Danao City, Cebu · June 30, 2026</p>
      </div>

      {/* Stat cards — 2 columns like the inspo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          const c = colorMap[s.color];
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-medium mb-1">{s.label}</p>
                  <p className={`text-4xl font-bold ${c.value} leading-none`}>{s.value}</p>
                </div>
                {/* Trend badge */}
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl ${c.trendBg} ${c.trend}`}>
                  {s.trendUp
                    ? <ArrowUpRight size={13} />
                    : <ArrowDownRight size={13} />
                  }
                  {s.trend}
                </span>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{s.sub}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent blotter */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Blotter Cases</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest filed and ongoing cases</p>
            </div>
            <Link
              href="/blotter"
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {recentBlotter.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50 transition cursor-pointer group"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition">{b.case_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.complainant} vs {b.respondent}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest actions across all modules</p>
          </div>

          <div className="flex flex-col gap-1">
            {recentActivity.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-start gap-4 p-3.5 rounded-xl transition hover:bg-gray-50
                  ${i !== recentActivity.length - 1 ? "border-b border-gray-50" : ""}`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{a.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.user} · {a.time}</p>
                </div>
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
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