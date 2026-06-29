"use client";

import { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/residents": "Resident Registry (RBI)",
  "/households": "Household Management",
  "/certificates": "Certificate Issuance",
  "/blotter": "Blotter / Incident Log",
  "/officials": "Barangay Officials",
  "/registries": "Special Registries",
  "/health": "Health Records",
  "/equipment": "Equipment Inventory",
  "/financial": "Financial Records",
  "/meetings": "Meeting Records",
  "/barangay-id": "Barangay ID",
  "/reports": "Reports",
  "/admin/users": "User Management",
  "/admin/settings": "System Settings",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  )?.[1] ?? "Brgy-RMS";

  return (
    <header className="bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="text-gray-400 hover:text-gray-700 transition"
      >
        <Menu size={18} />
      </button>

      <h1 className="text-sm font-semibold text-gray-800 hidden sm:block">{title}</h1>

      <div className="flex-1 max-w-xs ml-auto sm:ml-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition"
          />
        </div>
      </div>

      <button className="text-gray-400 hover:text-gray-700 transition relative">
        <Bell size={18} />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"></span>
      </button>
    </header>
  );
}