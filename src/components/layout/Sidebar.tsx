"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Home, FileText, Shield,
  Package, DollarSign, Users2, UserCheck, Activity,
  BarChart2, Settings, CreditCard, Heart, ChevronRight
} from "lucide-react";

const navItems = [
  {
    group: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "RBI", href: "/residents", icon: Users },
      { label: "Households", href: "/households", icon: Home },
    ]
  },
  {
    group: "Records",
    items: [
      { label: "Certificates", href: "/certificates", icon: FileText },
      { label: "Blotter", href: "/blotter", icon: Shield },
      { label: "Officials", href: "/officials", icon: UserCheck },
      { label: "Barangay ID", href: "/barangay-id", icon: CreditCard },
    ]
  },
  {
    group: "Registries",
    items: [
      { label: "Special Registries", href: "/registries", icon: Users2 },
      { label: "Health Records", href: "/health", icon: Heart },
    ]
  },
  {
    group: "Operations",
    items: [
      { label: "Equipment", href: "/equipment", icon: Package },
      { label: "Financial", href: "/financial", icon: DollarSign },
      { label: "Meetings", href: "/meetings", icon: Activity },
    ]
  },
  {
    group: "Admin",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart2 },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ]
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={`${collapsed ? "w-0 overflow-hidden" : "w-65"} 
        bg-white border-r border-gray-100 flex flex-col transition-all duration-200 shrink-0 h-screen`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">Brgy. Quisol</div>
          <div className="text-xs text-gray-400 whitespace-nowrap">Danao City, Cebu</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((group) => (
          <div key={group.group} className="mb-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">
              {group.group}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition mb-0.5
                    ${active
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {active && <ChevronRight size={13} className="ml-auto" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
            A
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-gray-800 whitespace-nowrap">Admin</div>
            <div className="text-[10px] text-gray-400 whitespace-nowrap">Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  );
}