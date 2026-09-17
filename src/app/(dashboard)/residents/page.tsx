// FILE: src/app/(dashboard)/residents/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, SlidersHorizontal, ChevronRight,
  Plus, X, Users, Mars, Venus,
} from "lucide-react";
import ResidentDetailSheet from "@/components/residents/ResidentDetailSheet";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Purok { id: number; name: string }
interface Household { id: number; household_no: string; address: string }
interface Resident {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  sex: string;
  civil_status: string;
  is_archived: boolean;
  purok: Purok | null;
  household: Household | null;
}
interface FilterState { sex: string; civil_status: string; purok_id: string }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fullName(r: Resident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mid  = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mid}`;
}

// ─── FILTER PANEL ─────────────────────────────────────────────────────────────
function FilterPanel({
  puroks, filters, onChange, onClose,
}: {
  puroks:   Purok[];
  filters:  FilterState;
  onChange: (f: FilterState) => void;
  onClose:  () => void;
}) {
  const [local, setLocal] = useState(filters);
  const set = (k: keyof FilterState, v: string) => setLocal(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-white dark:bg-[#151822] border-b border-[#E1E3E8] dark:border-[#282D3A] px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#1B2230] dark:text-[#E8E9EE]">Filters</span>
        <button onClick={onClose} className="text-[#9096A3] dark:text-[#767D8F] hover:text-[#5B6272] dark:hover:text-[#A2A8B8] transition">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10.5px] font-medium text-[#9096A3] dark:text-[#767D8F] block mb-1">Sex</label>
          <select value={local.sex} onChange={e => set("sex", e.target.value)}
            className="w-full text-[11px] border border-[#E1E3E8] dark:border-[#282D3A] rounded px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white dark:bg-[#151822]">
            <option value="">All</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label className="text-[10.5px] font-medium text-[#9096A3] dark:text-[#767D8F] block mb-1">Civil status</label>
          <select value={local.civil_status} onChange={e => set("civil_status", e.target.value)}
            className="w-full text-[11px] border border-[#E1E3E8] dark:border-[#282D3A] rounded px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white dark:bg-[#151822]">
            <option value="">All</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="WIDOWED">Widowed</option>
            <option value="SEPARATED">Separated</option>
            <option value="LIVE_IN">Live-in</option>
          </select>
        </div>
        <div>
          <label className="text-[10.5px] font-medium text-[#9096A3] dark:text-[#767D8F] block mb-1">Purok</label>
          <select value={local.purok_id} onChange={e => set("purok_id", e.target.value)}
            className="w-full text-[11px] border border-[#E1E3E8] dark:border-[#282D3A] rounded px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white dark:bg-[#151822]">
            <option value="">All Puroks</option>
            {puroks.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setLocal({ sex: "", civil_status: "", purok_id: "" })}
          className="flex-1 text-[11px] py-1.5 rounded border border-[#E1E3E8] dark:border-[#282D3A] text-[#5B6272] dark:text-[#A2A8B8] hover:bg-[#F8F9FB] dark:hover:bg-[#1A1E29] transition">
          Clear
        </button>
        <button onClick={() => { onChange(local); onClose(); }}
          className="flex-1 text-[11px] py-1.5 rounded bg-[#3B82F6] text-white hover:bg-[#2563EB] transition font-medium">
          Apply
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ResidentsPage() {
  const router = useRouter();

  const [residents,  setResidents]  = useState<Resident[]>([]);
  const [puroks,     setPuroks]     = useState<Purok[]>([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters,    setFilters]    = useState<FilterState>({ sex: "", civil_status: "", purok_id: "" });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/puroks")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setPuroks(data);
      })
      .catch(() => {
        // Non-fatal — the filter dropdown just stays empty if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    try {
      
      const params = new URLSearchParams({ limit: "100" });
      if (search)                params.set("search",       search);
      if (filters.sex)           params.set("sex",          filters.sex);
      if (filters.civil_status)  params.set("civil_status", filters.civil_status);
      if (filters.purok_id)      params.set("purok_id",     filters.purok_id);
      const res  = await fetch(`/api/residents?${params}`);
      const data = await res.json();
      setResidents(data.residents ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const t = setTimeout(loadResidents, 300);
    return () => clearTimeout(t);
  }, [loadResidents]);

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap pb-3.5 border-b border-[#E1E3E8] dark:border-[#282D3A] mb-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1B2230] dark:text-[#E8E9EE]">
            Residents
          </h1>
          <p className="text-[12.5px] text-[#5B6272] dark:text-[#A2A8B8] mt-0.5">
            {loading ? "Loading…" : `${residents.length} resident${residents.length !== 1 ? "s" : ""} on file`}
          </p>
        </div>
        <button
          onClick={() => router.push("/residents/new")}
          className="flex items-center gap-2 px-3.5 h-9 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium transition"
        >
          <Plus size={15} strokeWidth={1.8} />
          Register resident
        </button>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="bg-white dark:bg-[#151822] rounded border border-[#E1E3E8] dark:border-[#282D3A] overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9096A3] dark:text-[#767D8F]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Find a resident by name"
              className="w-full pl-8 pr-3 h-9 text-[13px] bg-[#F8F9FB] dark:bg-[#1A1E29] rounded border border-transparent focus:outline-none focus:border-[#3B82F6] focus:bg-white dark:focus:bg-[#151822] transition placeholder:text-[#9096A3] dark:placeholder:text-[#767D8F] text-[#1B2230] dark:text-[#E8E9EE]"
            />
          </div>
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`h-9 w-9 flex items-center justify-center rounded transition shrink-0 relative border
              ${showFilter || activeFilters > 0
                ? "bg-[#EBF3FF] border-[#3B82F6] text-[#3B82F6] dark:bg-[#14243F] dark:text-[#5B9BFA] dark:border-[#5B9BFA]"
                : "bg-white dark:bg-[#151822] border-[#E1E3E8] dark:border-[#282D3A] text-[#5B6272] dark:text-[#A2A8B8] hover:border-[#9096A3]"}`}
          >
            <SlidersHorizontal size={14} strokeWidth={1.8} />
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#A32A25] text-white text-[9px] flex items-center justify-center font-semibold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <FilterPanel
            puroks={puroks}
            filters={filters}
            onChange={f => { setFilters(f); }}
            onClose={() => setShowFilter(false)}
          />
        )}
      </div>

      {/* ── Ledger table ── */}
      <div className="bg-white dark:bg-[#151822] rounded border border-[#E1E3E8] dark:border-[#282D3A] overflow-hidden flex-1 flex flex-col">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : residents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-11 h-11 rounded-full bg-[#F8F9FB] dark:bg-[#1A1E29] flex items-center justify-center">
              <Users size={19} strokeWidth={1.6} className="text-[#C7CBD3] dark:text-[#484F5C]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#5B6272] dark:text-[#A2A8B8]">No residents found</p>
              <p className="text-[11.5px] text-[#9096A3] dark:text-[#767D8F] mt-0.5">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-180 border-collapse">
              <thead>
                <tr>
                  {["Resident", "Sex", "Civil status", "Purok", ""].map(h => (
                    <th
                      key={h}
                      className="sticky top-0 z-1 bg-[#F8F9FB] dark:bg-[#1A1E29] text-left text-[10.5px] font-semibold text-[#9096A3] dark:text-[#767D8F] px-4 py-2.5 border-b border-[#E1E3E8] dark:border-[#282D3A] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="group cursor-pointer border-b border-[#ECEDF1] dark:border-[#20242F] last:border-0 hover:bg-[#F8F9FB] dark:hover:bg-[#1A1E29] transition-colors"
                  >
                    {/* Name — left edge carries an archived flag, when relevant */}
                    <td className="relative px-4 py-3 pl-4.25">
                      <span
                        className={`absolute left-0 top-0 bottom-0 w-0.75 ${
                          r.is_archived ? "bg-[#9096A3] dark:bg-[#767D8F]" : "bg-transparent"
                        }`}
                      />
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#EBF3FF] dark:bg-[#14243F] flex items-center justify-center shrink-0 text-[11px] font-semibold text-[#3B82F6] dark:text-[#5B9BFA]">
                          {r.fname[0]}{r.lname[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1B2230] dark:text-[#E8E9EE] truncate">{fullName(r)}</p>
                          <p className="text-[11px] text-[#9096A3] dark:text-[#767D8F] font-mono">
                            BM{String(r.id).padStart(7, "0")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Sex */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 w-fit rounded-full px-2 h-5.25 text-[11px] font-medium ${
                          r.sex === "MALE"
                            ? "bg-[#EBF3FF] text-[#3B82F6] dark:bg-[#14243F] dark:text-[#5B9BFA]"
                            : "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400"
                        }`}
                      >
                        {r.sex === "MALE" ? <Mars size={11} strokeWidth={2} /> : <Venus size={11} strokeWidth={2} />}
                        {r.sex === "MALE" ? "Male" : "Female"}
                      </span>
                    </td>

                    {/* Civil Status */}
                    <td className="px-4 py-3 text-[12.5px] text-[#5B6272] dark:text-[#A2A8B8]">
                      {r.civil_status.replace("_", "-").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                    </td>

                    {/* Purok */}
                    <td className="px-4 py-3 text-[12.5px] text-[#5B6272] dark:text-[#A2A8B8]">
                      {r.purok?.name ?? "—"}
                    </td>

                    {/* Chevron — always present, just brightens on hover, so the
                        row never visually shifts when the pointer arrives */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ChevronRight size={16} strokeWidth={1.8} className="text-[#C7CBD3] dark:text-[#484F5C] group-hover:text-[#3B82F6] dark:group-hover:text-[#5B9BFA] transition-colors" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <div className="fixed bottom-6 right-6 z-10 lg:hidden">
        <button
          onClick={() => router.push("/residents/new")}
          className="w-12 h-12 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center justify-center shadow-lg transition"
        >
          <Plus size={20} />
        </button>
      </div>

      <ResidentDetailSheet
        residentId={selectedId}
        onClose={() => setSelectedId(null)}
        onArchived={loadResidents}
      />
    </div>
  );
}