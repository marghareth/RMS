"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import BlotterCaseSheet from "@/components/blotter/BlotterCaseSheet";
import { BlotterCaseMock, BlotterStatus, formatISODate } from "@/lib/mock/blotter";

// ── FILTER STATE ─────────────────────────────────────────────────────────────
interface FilterState {
  status: string;
  escalated: boolean;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { status: "", escalated: false, date_from: "", date_to: "" };

export default function BlotterListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  //const [cases] = useState<BlotterCaseMock[]>(MOCK_BLOTTER_CASES);
  //const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
   const [cases, setCases] = useState<BlotterCaseMock[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

   const loadCases = useCallback(async () => {
     setLoading(true);
     try {
       const params = new URLSearchParams({ limit: "50" });
       if (search) params.set("search", search);
       if (filters.status) params.set("status", filters.status);
       if (filters.escalated) params.set("escalated", "true");
       if (filters.date_from) params.set("date_from", filters.date_from);
       if (filters.date_to) params.set("date_to", filters.date_to);

       const res = await fetch(`/api/blotter?${params}`);
       const data = await res.json();
       setCases(data.cases ?? []);
     } catch (e) {
       console.error(e);
     } finally {
       setLoading(false);
     }
   }, [search, filters]);

   useEffect(() => {
     const t = setTimeout(loadCases, 300);
     return () => clearTimeout(t);
   }, [loadCases]);

  // ── CLIENT-SIDE FILTERING (stands in for the API query above) ───────────
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.escalated && !c.escalated) return false;
      if (filters.date_from && c.incident_date < filters.date_from) return false;
      if (filters.date_to && c.incident_date > filters.date_to) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${c.case_number} ${c.complainant_name} ${c.respondent_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cases, search, filters]);

  const counts = useMemo(
    () => ({
      filed: cases.filter((c) => c.status === "FILED").length,
      ongoing: cases.filter((c) => c.status === "ONGOING").length,
      resolved: cases.filter((c) => c.status === "RESOLVED").length,
      escalated: cases.filter((c) => c.escalated).length,
    }),
    [cases]
  );

  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.escalated ? 1 : 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Blotter / Incident Log"
        subtitle="File complaints, track hearings, and manage case statuses"
        actions={
          <button
            onClick={() => router.push("/blotter/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            <Plus size={15} />
            File New Case
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Filed" value={counts.filed} sub="Awaiting first hearing" icon={FolderOpen} color="blue" />
        <StatCard label="Ongoing" value={counts.ongoing} sub="Active mediation" icon={Clock} color="amber" />
        <StatCard label="Resolved" value={counts.resolved} sub="Settled this period" icon={CheckCircle2} color="green" />
        <StatCard label="Escalated" value={counts.escalated} sub="Elevated to higher agency" icon={AlertTriangle} color="red" />
      </div>

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case no., complainant, or respondent"
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
          <div className="absolute right-0 top-full z-20 mt-2 w-80 space-y-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4 shadow-lg">
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
                <option value="FILED">Filed</option>
                <option value="ONGOING">Ongoing</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
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

            <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151] dark:text-[#D4D4D4]">
              <input
                type="checkbox"
                checked={filters.escalated}
                onChange={(e) => setFilters((f) => ({ ...f, escalated: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-[#3B82F6] dark:text-[#60A5FA] focus:ring-[#3B82F6] dark:focus:ring-[#60A5FA]"
              />
              Escalated cases only
            </label>

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

      {/* Case log table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No blotter cases found"
            description="Try adjusting your search or filters, or file a new case."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Case No.</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Complainant</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Respondent</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Incident Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Hearing Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className="cursor-pointer border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937] dark:text-white">{c.case_number}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{c.complainant_name}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{c.respondent_name}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{formatISODate(c.incident_date)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                    {formatISODate(c.hearing_date) ?? <span className="text-[#D1D5DB] dark:text-[#525252]">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status as BlotterStatus} />
                      {c.escalated && <StatusBadge status="ESCALATED" />}
                    </div>
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

      <BlotterCaseSheet
        caseId={selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onUpdated={loadCases}
      />
    </div>
  );
}