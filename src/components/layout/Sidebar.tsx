"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  DollarSign,
  Users2,
  UserCheck,
  FileText,
  BarChart2,
  Settings,
  Shield,
} from "lucide-react";

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "RBI", href: "/residents", icon: Users },
  { label: "Inventory", href: "/equipment", icon: Package },
  { label: "Financial", href: "/financial", icon: DollarSign },
  { label: "Assembly", href: "/meetings", icon: Users2 },
  { label: "Officials", href: "/officials", icon: UserCheck },
  { label: "Blotter", href: "/blotter", icon: Shield },
  { label: "Certificate", href: "/certificates", icon: FileText },
  { label: "Report", href: "/reports", icon: BarChart2 },
];

const bottomNav = [
  { label: "Account", href: "/admin/users", icon: Users },
  { label: "Setting", href: "/admin/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-[#E9EAEC] bg-white transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-0 border-r-0" : "w-[240px]"
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
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.25 : 2}
                  className={`shrink-0 ${
                    active
                      ? "text-white"
                      : "text-[#9CA3AF] group-hover:text-[#374151]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-[#E9EAEC] pt-4">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.25 : 2}
                  className={`shrink-0 ${
                    active
                      ? "text-white"
                      : "text-[#9CA3AF] group-hover:text-[#374151]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
