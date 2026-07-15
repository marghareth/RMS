"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, SlidersHorizontal, ChevronRight,
  Plus, X, Users,
} from "lucide-react";
import { getMockPuroks, getMockResidents, type Resident as MockResident } from "@/lib/mockResidents";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Purok { id: number; name: string }
interface Resident extends MockResident {}
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
    <div className="bg-white border-b border-[#E9EAEC] px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#1F2937] uppercase tracking-widest">Filters</span>
        <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide block mb-1">Sex</label>
          <select value={local.sex} onChange={e => set("sex", e.target.value)}
            className="w-full text-[11px] border border-[#E9EAEC] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white">
            <option value="">All</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide block mb-1">Civil Status</label>
          <select value={local.civil_status} onChange={e => set("civil_status", e.target.value)}
            className="w-full text-[11px] border border-[#E9EAEC] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white">
            <option value="">All</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="WIDOWED">Widowed</option>
            <option value="SEPARATED">Separated</option>
            <option value="LIVE_IN">Live-in</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide block mb-1">Purok</label>
          <select value={local.purok_id} onChange={e => set("purok_id", e.target.value)}
            className="w-full text-[11px] border border-[#E9EAEC] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white">
            <option value="">All Puroks</option>
            {puroks.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setLocal({ sex: "", civil_status: "", purok_id: "" })}
          className="flex-1 text-[11px] py-1.5 rounded-lg border border-[#E9EAEC] text-[#6B7280] hover:bg-[#F4F5F7] transition">
          Clear
        </button>
        <button onClick={() => { onChange(local); onClose(); }}
          className="flex-1 text-[11px] py-1.5 rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563EB] transition font-semibold">
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
  const [puroks,     setPuroks]     = useState(() => getMockPuroks());
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters,    setFilters]    = useState<FilterState>({ sex: "", civil_status: "", purok_id: "" });

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
      setResidents(data);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">
            Residents
          </h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            {loading ? "Loading…" : `${residents.length} resident${residents.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <button
          onClick={() => router.push("/residents/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-bold transition shadow-sm"
        >
          <Plus size={14} />
          Add Resident
        </button>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Name"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[#F4F5F7] rounded-xl border border-transparent focus:outline-none focus:border-[#3B82F6] focus:bg-white transition placeholder:text-[#9CA3AF] text-[#1F2937]"
            />
          </div>
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition shrink-0 relative
              ${showFilter || activeFilters > 0 ? "bg-[#3B82F6] text-white" : "bg-[#F4F5F7] text-[#6B7280] hover:bg-[#E5E7EB]"}`}
          >
            <SlidersHorizontal size={14} />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
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

      {/* ── List ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden flex-1">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : residents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center">
              <Users size={20} className="text-[#D1D5DB]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#6B7280]">No residents found</p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.4fr] gap-4 px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E9EAEC]">
              {["Name", "Sex", "Civil Status", "Purok", ""].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {residents.map((r, i) => (
              <button
                key={r.id}
                onClick={() => router.push(`/residents/${r.id}`)}
                className={`w-full text-left grid grid-cols-[2fr_1fr_1fr_1fr_0.4fr] gap-4 px-5 py-3.5 items-center border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition group last:border-0 ${i % 2 !== 0 ? "bg-[#FAFAFA]" : "bg-white"}`}
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 text-[12px] font-black text-[#3B82F6]">
                    {r.fname[0]}{r.lname[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1F2937] truncate">{fullName(r)}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                      BM{String(r.id).padStart(7, "0")}
                    </p>
                  </div>
                </div>

                {/* Sex */}
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit
                  ${r.sex === "MALE" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                  {r.sex === "MALE" ? "Male" : "Female"}
                </span>

                {/* Civil Status */}
                <span className="text-[12px] text-[#6B7280] capitalize">
                  {r.civil_status.replace("_", "-").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                </span>

                {/* Purok */}
                <span className="text-[12px] text-[#6B7280]">{r.purok?.name ?? "—"}</span>

                {/* Chevron */}
                <div className="flex justify-end">
                  <ChevronRight size={16} className="text-[#D1D5DB] group-hover:text-[#3B82F6] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <div className="fixed bottom-6 right-6 z-10">
        <button
          onClick={() => router.push("/residents/new")}
          className="w-12 h-12 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-lg transition"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}