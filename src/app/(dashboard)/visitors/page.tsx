// FILE: src/app/(dashboard)/visitors/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  DoorOpen, LogIn, LogOut, Search, SlidersHorizontal, ChevronRight, Plus, X,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import VisitorLogSheet from "@/components/visitors/VisitorLogSheet";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface VisitorLog {
  id: number;
  visitor_name: string;
  contact: string | null;
  purpose: string;
  person_to_visit: string | null;
  time_in: string;
  time_out: string | null;
}

interface FilterState {
  status: string; // "" | "active" | "checked_out"
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { status: "", date_from: "", date_to: "" };

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function VisitorLogListPage() {
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (filters.status) params.set("status", filters.status);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const res = await fetch(`/api/visitor-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const t = setTimeout(loadLogs, 300);
    return () => clearTimeout(t);
  }, [loadLogs]);

  const counts = useMemo(
    () => ({
      active: logs.filter((l) => !l.time_out).length,
      today: logs.filter((l) => {
        const d = new Date(l.time_in);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length,
      total: logs.length,
    }),
    [logs]
  );

  const activeFilterCount = (filters.status ? 1 : 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Visitor Log"
        subtitle="Track walk-in visitors to the barangay hall"
        actions={
          <button
            onClick={() => setSelectedId("new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            <Plus size={15} />
            New Visitor
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Checked In Now" value={counts.active} sub="Currently in the building" icon={LogIn} color="blue" />
        <StatCard label="Visitors Today" value={counts.today} sub="Logged since midnight" icon={DoorOpen} color="amber" />
        <StatCard label="Checked Out" value={counts.total - counts.active} sub="Completed visits" icon={LogOut} color="green" />
      </div>

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor name or purpose"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-[#3B82F6] text-white" : "bg-white dark:bg-[#171717] text-[#6B7280] dark:text-[#A3A3A3] border border-[#E9EAEC] dark:border-[#262626] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          }`}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 dark:bg-red-500 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilter && (
          <div className="absolute right-0 top-full z-20 mt-2 w-72 space-y-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937] dark:text-white">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              >
                <option value="">All</option>
                <option value="active">Active (checked in)</option>
                <option value="checked_out">Checked out</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] dark:border-[#262626] py-2 text-[12px] text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 rounded-lg bg-[#3B82F6] py-2 text-[12px] font-semibold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No visitors logged"
            description="Try adjusting your search or filters, or log a new visitor."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Visitor Name</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Purpose</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Person to Visit</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Time In</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className="cursor-pointer border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937] dark:text-white">{l.visitor_name.toUpperCase()}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{l.purpose}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{l.person_to_visit || "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{formatTime(l.time_in)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.time_out ? "CHECKED_OUT" : "ACTIVE"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} className="ml-auto text-[#D1D5DB] dark:text-[#525252]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <VisitorLogSheet
        visitorId={selectedId}
        onClose={() => setSelectedId(null)}
        onSaved={loadLogs}
      />
    </div>
  );
}