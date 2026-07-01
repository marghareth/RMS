"use client";

import {
  LayoutDashboard,
  Users,
  IdCard,
  FileText,
  ScrollText,
  HeartPulse,
  Package,
  DollarSign,
  Users2,
  UserCheck,
  BarChart2,
  ShieldCheck,
  Settings,
} from "lucide-react";
import NavItem from "./NavItem";
import NavGroup from "./NavGroup";

// Grouped + single items, in display order
const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, type: "link" as const },
  {
    label: "RBI",
    icon: Users,
    basePath: "/residents",
    type: "group" as const,
    children: [
      { label: "Residents", href: "/residents", addHref: "/residents/new" },
      { label: "Households", href: "/households", addHref: "/households/new" },
    ],
  },
  {
    label: "Registries",
    icon: IdCard,
    basePath: "/registries",
    type: "group" as const,
    children: [
      { label: "Senior Citizens", href: "/registries/senior-citizens" },
      { label: "PWD", href: "/registries/pwd" },
      { label: "4Ps Beneficiaries", href: "/registries/four-ps" },
    ],
  },
  {
    label: "Certificates",
    icon: FileText,
    basePath: "/certificates",
    type: "group" as const,
    children: [
      { label: "All Certificates", href: "/certificates", addHref: "/certificates/new" },
      { label: "Barangay ID", href: "/barangay_id", addHref: "/barangay_id/new" },
    ],
  },
  {
    label: "Blotter",
    href: "/blotter",
    icon: ScrollText,
    addHref: "/blotter/new",
    type: "link" as const,
  },
  {
    label: "Health",
    icon: HeartPulse,
    basePath: "/health",
    type: "group" as const,
    children: [
      { label: "Health Records", href: "/health", addHref: "/health/new" },
      { label: "Vaccinations", href: "/health/vaccinations", addHref: "/health/vaccinations/new" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    basePath: "/equipment",
    type: "group" as const,
    children: [
      { label: "Equipment", href: "/equipment", addHref: "/equipment/new" },
      { label: "Borrow Item", href: "/equipment/borrow" },
      { label: "Return Item", href: "/equipment/return" },
    ],
  },
  {
    label: "Financial",
    icon: DollarSign,
    basePath: "/financial",
    type: "group" as const,
    children: [
      { label: "Records", href: "/financial", addHref: "/financial/new" },
      { label: "Summary", href: "/financial/summary" },
    ],
  },
  {
    label: "Assembly",
    href: "/meetings",
    icon: Users2,
    addHref: "/meetings/new",
    type: "link" as const,
  },
  {
    label: "Officials",
    href: "/officials",
    icon: UserCheck,
    addHref: "/officials/new",
    type: "link" as const,
  },
  {
    label: "Reports",
    icon: BarChart2,
    basePath: "/reports",
    type: "group" as const,
    children: [
      { label: "Overview", href: "/reports" },
      { label: "Population", href: "/reports/population" },
      { label: "Registries", href: "/reports/registries" },
      { label: "Certificates", href: "/reports/certificates" },
      { label: "Blotter", href: "/reports/blotter" },
      { label: "Financial", href: "/reports/financial" },
      { label: "Inventory", href: "/reports/inventory" },
    ],
  },
];

const bottomNav = [
  {
    label: "Admin",
    icon: ShieldCheck,
    basePath: "/admin",
    type: "group" as const,
    children: [
      { label: "Users", href: "/admin/users", addHref: "/admin/users/new" },
      { label: "Audit Logs", href: "/admin/audit-logs" },
      { label: "Backup", href: "/admin/backup" },
    ],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    type: "link" as const,
  },
];

export default function Sidebar({
  collapsed,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-[#E9EAEC] bg-white transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-0 border-r-0" : "w-60"
      }`}
    >
      {/* Brand */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#E9EAEC] px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              fill="white"
            />
            <rect x="9" y="12" width="6" height="10" fill="#3B82F6" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-[#1F2937]">
            Brgy. Quisol
          </p>
          <p className="truncate text-[11px] text-[#9CA3AF]">Danao City, Cebu</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-1">
          {mainNav.map((item) =>
            item.type === "group" ? (
              <NavGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                basePath={item.basePath}
                items={item.children}
              />
            ) : (
              <NavItem
                key={item.label}
                label={item.label}
                href={item.href}
                icon={item.icon}
                addHref={item.addHref}
              />
            )
          )}
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-[#E9EAEC] pt-4">
          {bottomNav.map((item) =>
            item.type === "group" ? (
              <NavGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                basePath={item.basePath}
                items={item.children}
              />
            ) : (
              <NavItem
                key={item.label}
                label={item.label}
                href={item.href}
                icon={item.icon}
              />
            )
          )}
        </div>
      </nav>
    </aside>
  );
}