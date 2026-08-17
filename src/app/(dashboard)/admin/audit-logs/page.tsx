"use client";

import { useMemo, useState, useEffect } from "react";
import { History, Search, SlidersHorizontal, X } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import {
  AuditLogMock,
  AUDIT_TABLES,
  AUDIT_ACTIONS,
  actionTone,
  formatISODateTime,
} from "@/lib/mock/admin";

interface FilterState {
  table_affected: string;
  action: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { table_affected: "", action: "", date_from: "", date_to: "" };

const TONE_CLASSES: Record<string, string> = {
  green: "bg-[#D1FAE5] dark:bg-emerald-500/15 text-[#059669] dark:text-[#34D399]",
  blue: "bg-[#EBF3FF] dark:bg-blue-500/15 text-[#1D4ED8] dark:text-[#93C5FD]",
  red: "bg-[#FEE2E2] dark:bg-red-500/15 text-[#DC2626] dark:text-[#F87171]",
  amber: "bg-[#FEF3C7] dark:bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24]",
};

export default function AuditLogsPage() {

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  const [logs, setLogs] = useState<AuditLogMock[]>([]);
  const [loading, setLoading] = useState(true);
  //
  useEffect(() => {
    async function loadLogs() {
       setLoading(true);
       try {
         const params = new URLSearchParams({ limit: "50" });
         if (filters.table_affected) params.set("table_affected", filters.table_affected);
         if (filters.date_from) params.set("date_from", filters.date_from);
         if (filters.date_to) params.set("date_to", filters.date_to);
         // Note: the current API doesn't filter by `action` server-side —
         // that filter is applied client-side below regardless.
         //
          const res = await fetch(`/api/audit-logs?${params}`);
          const data = await res.json();
          setLogs(data.logs ?? []);
       } catch (e) {
         console.error(e);
       } finally {
         setLoading(false);
       }
     }
     loadLogs();
   }, [filters]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filters.table_affected && l.table_affected !== filters.table_affected) return false;
      if (filters.action && l.action !== filters.action) return false;
      if (filters.date_from && l.performed_at.slice(0, 10) < filters.date_from) return false;
      if (filters.date_to && l.performed_at.slice(0, 10) > filters.date_to) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${l.user.username} ${l.action} ${l.table_affected} ${l.details ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, filters]);

  const activeFilterCount =
    (filters.table_affected ? 1 : 0) + (filters.action ? 1 : 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every action taken across the system" />

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, action, table, or details"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-[#3B82F6] text-white" : "border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
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
          <div className="absolute right-0 top-full z-20 mt-2 w-80 space-y-3 rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-lg dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937] dark:text-white">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Table
                </label>
                <select
                  value={filters.table_affected}
                  onChange={(e) => setFilters((f) => ({ ...f, table_affected: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                >
                  <option value="">All</option>
                  {AUDIT_TABLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                >
                  <option value="">All</option>
                  {AUDIT_ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
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
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] dark:border-[#333333] py-2 text-[12px] text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
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

      {/* Logs table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="No audit log entries found" description="Try adjusting your search or filters." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#333333] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Timestamp</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">User</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Action</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Table</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Record ID</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]">
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{formatISODateTime(l.performed_at)}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2937] dark:text-white">{l.user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASSES[actionTone(l.action)]}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{l.table_affected}</td>
                  <td className="px-4 py-3 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{l.record_id ?? "—"}</td>
                  <td className="max-w-[320px] px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{l.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}