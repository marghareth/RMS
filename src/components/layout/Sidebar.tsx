"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Package, DollarSign,
  Users2, UserCheck, FileText, BarChart2,
  Settings, Menu
} from "lucide-react";

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "RBI", href: "/residents", icon: Users },
  { label: "Inventory", href: "/equipment", icon: Package },
  { label: "Financial", href: "/financial", icon: DollarSign },
  { label: "Assembly", href: "/meetings", icon: Users2 },
  { label: "Officials", href: "/officials", icon: UserCheck },
  { label: "Certificate", href: "/certificates", icon: FileText },
  { label: "Report", href: "/reports", icon: BarChart2 },
];

const bottomNav = [
  { label: "Account", href: "/admin/users", icon: Users },
  { label: "Setting", href: "/admin/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
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
      style={{ width: collapsed ? 0 : 280 }}
      className="bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen overflow-hidden transition-all duration-200"
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition shrink-0"
        >
          <Menu size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          BQ
        </div>
        <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
          BARANGAY NAME
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col">
        <div className="flex flex-col gap-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${active
                    ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  }`}
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4" />

        <div className="flex flex-col gap-1">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${active
                    ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  }`}
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}