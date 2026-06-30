"use client";

import { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [search, setSearch] = useState("");

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-[#E9EAEC] bg-white px-5 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F4F5F7] hover:text-[#1F2937]"
      >
        <Menu size={20} />
      </button>

      <div className="flex min-w-0 flex-1 items-center">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-lg border border-[#E9EAEC] bg-[#F4F5F7] pl-10 pr-4 text-[13px] text-[#1F2937] transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/15"
          />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F4F5F7] hover:text-[#1F2937]"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#3B82F6]" />
        </button>

        <div className="mx-1 hidden h-6 w-px bg-[#E9EAEC] sm:block" />

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-[#F4F5F7]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-[11px] font-bold text-white">
            N
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-[13px] font-semibold leading-tight text-[#1F2937]">
              Admin
            </p>
            <p className="text-[11px] text-[#9CA3AF]">Administrator</p>
          </div>
        </button>
      </div>
    </header>
  );
}
