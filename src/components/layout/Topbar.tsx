"use client";

import { useState } from "react";
import { Menu, Search, Bell, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/residents": "RBI",
  "/households": "Households",
  "/certificates": "Certificate",
  "/blotter": "Blotter",
  "/officials": "Officials",
  "/registries": "Special Registries",
  "/health": "Health Records",
  "/equipment": "Inventory",
  "/financial": "Financial",
  "/meetings": "Assembly",
  "/barangay-id": "Barangay ID",
  "/reports": "Report",
  "/admin/users": "Account",
  "/admin/settings": "Setting",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  )?.[1] ?? "Dashboard";

  return (
    <header className="bg-white border-b border-gray-100 h-16 flex items-center px-6 gap-4 shrink-0">

      <button
        onClick={onMenuClick}
        className="text-gray-400 hover:text-gray-700 transition lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
            N
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-gray-800 leading-tight">Admin</div>
            <div className="text-[10px] text-gray-400">Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}