"use client";

import { useMemo, useState, useEffect } from "react";
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
  //
   useEffect(() => {
     async function loadCases() {
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
     }
     const t = setTimeout(loadCases, 300);
     return () => clearTimeout(t);
   }, [search, filters]);

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
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
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
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case no., complainant, or respondent"
            className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-[#3B82F6] text-white" : "bg-white text-[#6B7280] border border-[#E9EAEC] hover:bg-[#F4F5F7]"
          }`}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilter && (
          <div className="absolute right-0 top-full z-20 mt-2 w-80 space-y-3 rounded-xl border border-[#E9EAEC] bg-white p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937]">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
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
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151]">
              <input
                type="checkbox"
                checked={filters.escalated}
                onChange={(e) => setFilters((f) => ({ ...f, escalated: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Escalated cases only
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] py-2 text-[12px] text-[#6B7280] transition hover:bg-[#F4F5F7]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 rounded-lg bg-[#3B82F6] py-2 text-[12px] font-semibold text-white transition hover:bg-[#2563EB]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Case log table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Case No.</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Complainant</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Respondent</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Incident Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Hearing Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/blotter/${c.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937]">{c.case_number}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{c.complainant_name}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{c.respondent_name}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280]">{formatISODate(c.incident_date)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280]">
                    {formatISODate(c.hearing_date) ?? <span className="text-[#D1D5DB]">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status as BlotterStatus} />
                      {c.escalated && <StatusBadge status="ESCALATED" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} className="ml-auto text-[#D1D5DB]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}