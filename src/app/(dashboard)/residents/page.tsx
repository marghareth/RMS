"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ChevronRight, Plus, X } from "lucide-react";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Purok  { id: number; name: string }
interface Household {
  id:          number;
  household_no: string;
  address:     string;
  housing_type: string | null;
  water_source: string | null;
  comfort_room: string | null;
  members:     Resident[];
}
interface Resident {
  id:                     number;
  fname:                  string;
  lname:                  string;
  mname:                  string | null;
  name_extension:         string | null;
  birthdate:              string;
  place_of_birth:         string | null;
  sex:                    string;
  civil_status:           string;
  citizenship:            string;
  educational_attainment: string | null;
  occupation:             string | null;
  sector:                 string | null;
  purok:                  Purok | null;
  household:              Household | null;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date();
  const dob   = new Date(birthdate);
  let age     = today.getFullYear() - dob.getFullYear();
  const m     = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();
}

function fullName(r: Resident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  return `${r.lname}, ${r.fname}${ext}${r.mname ? " " + r.mname[0] + "." : ""}`;
}

// ── INFO ROW ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide min-w-40 shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-[#374151]">: {value ?? "—"}</span>
    </div>
  );
}

// ── FILTER DRAWER ─────────────────────────────────────────────────────────────
interface FilterState { sex: string; civil_status: string; purok_id: string }

function FilterDrawer({
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
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#E9EAEC] shadow-lg z-20 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold text-[#1F2937] uppercase tracking-wide">Filters</span>
        <button onClick={onClose}><X size={14} className="text-[#9CA3AF]" /></button>
      </div>

      {/* Sex */}
      <div>
        <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1">Sex</label>
        <select
          value={local.sex}
          onChange={e => set("sex", e.target.value)}
          className="w-full text-[12px] border border-[#E9EAEC] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="">All</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      {/* Civil Status */}
      <div>
        <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1">Civil Status</label>
        <select
          value={local.civil_status}
          onChange={e => set("civil_status", e.target.value)}
          className="w-full text-[12px] border border-[#E9EAEC] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="">All</option>
          <option value="SINGLE">Single</option>
          <option value="MARRIED">Married</option>
          <option value="WIDOWED">Widowed</option>
          <option value="SEPARATED">Separated</option>
          <option value="LIVE_IN">Live-in</option>
        </select>
      </div>

      {/* Purok */}
      <div>
        <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1">Purok</label>
        <select
          value={local.purok_id}
          onChange={e => set("purok_id", e.target.value)}
          className="w-full text-[12px] border border-[#E9EAEC] rounded-lg px-3 py-2 focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="">All Puroks</option>
          {puroks.map(p => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { setLocal({ sex: "", civil_status: "", purok_id: "" }); }}
          className="flex-1 text-[12px] py-2 rounded-lg border border-[#E9EAEC] text-[#6B7280] hover:bg-[#F4F5F7] transition"
        >
          Clear
        </button>
        <button
          onClick={() => { onChange(local); onClose(); }}
          className="flex-1 text-[12px] py-2 rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563EB] transition font-semibold"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ResidentsPage() {
  const router = useRouter();

  const [residents,  setResidents]  = useState<Resident[]>([]);
  const [puroks,     setPuroks]     = useState<Purok[]>([]);
  const [selected,   setSelected]   = useState<Resident | null>(null);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters,    setFilters]    = useState<FilterState>({ sex: "", civil_status: "", purok_id: "" });

  // Load puroks once
  useEffect(() => {
    fetch("/api/puroks")
      .then(r => r.json())
      .then(setPuroks)
      .catch(console.error);
  }, []);

  // Load residents when search/filters change
  const loadResidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search)            params.set("search",       search);
      if (filters.sex)       params.set("sex",          filters.sex);
      if (filters.civil_status) params.set("civil_status", filters.civil_status);
      if (filters.purok_id)  params.set("purok_id",     filters.purok_id);

      const res  = await fetch(`/api/residents?${params}`);
      const data = await res.json();
      setResidents(data.residents ?? []);
      if (!selected && data.residents?.length) setSelected(data.residents[0]);
    } catch (e) {
      console.error(e);
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
    <div className="flex min-h-[calc(100vh-124px)] gap-5">

      {/* ── Left: List panel ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] flex flex-col w-[320px] shrink-0 overflow-hidden relative">

        {/* Search bar */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-[#E9EAEC]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Name"
              className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-[#F4F5F7] rounded-xl border border-transparent focus:outline-none focus:border-[#3B82F6] focus:bg-white transition placeholder:text-[#9CA3AF] text-[#1F2937]"
            />
          </div>
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition shrink-0 relative
              ${showFilter || activeFilters ? "bg-[#3B82F6] text-white" : "bg-[#F4F5F7] text-[#6B7280] hover:bg-[#E5E7EB]"}`}
          >
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filter drawer */}
        {showFilter && (
          <div className="px-4 pb-3 border-b border-[#E9EAEC]">
            <FilterDrawer
              puroks={puroks}
              filters={filters}
              onChange={setFilters}
              onClose={() => setShowFilter(false)}
            />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : residents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-[12px] text-[#9CA3AF]">No residents found</p>
            </div>
          ) : (
            residents.map(r => {
              const active = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-[#F4F5F7] transition
                    ${active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold truncate ${active ? "text-white" : "text-[#1F2937]"}`}>
                      {fullName(r)}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                      {r.sex}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[10px] font-semibold ${active ? "text-blue-100" : "text-[#6B7280]"}`}>
                      {r.purok?.name ?? "—"}
                    </span>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB]"} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Add button */}
        <div className="p-4 flex justify-end border-t border-[#F4F5F7]">
          <button
            onClick={() => router.push("/residents/new")}
            className="w-10 h-10 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-md transition"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* ── Right: Detail panel ── */}
      {selected ? (
        <div className="flex-1 bg-white rounded-xl border border-[#E9EAEC] overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#E9EAEC]">
            <h2 className="text-[15px] font-black text-[#1F2937] uppercase tracking-wide">
              {selected.fname}{selected.name_extension ? " " + selected.name_extension : ""} {selected.mname ? selected.mname[0] + ". " : ""}{selected.lname}
            </h2>
            <span className="text-[13px] font-bold text-[#1F2937] uppercase tracking-widest">
              {selected.sex}
            </span>
          </div>

          {/* Personal Info */}
          <div className="mb-5">
            <InfoRow label="RBI ID"           value={`BM${String(selected.id).padStart(7, "0")}`} />
            <InfoRow label="Date of Birth"    value={formatDate(selected.birthdate)} />
            <InfoRow label="Place of Birth"   value={selected.place_of_birth} />
            <InfoRow label="Civil Status"     value={selected.civil_status.replace("_", "-")} />
            <InfoRow label="Citizenship"      value={selected.citizenship} />
            <InfoRow label="Educ. Attainment" value={selected.educational_attainment} />
            <InfoRow label="Occupation"       value={selected.occupation} />
            <InfoRow label="Age"              value={calcAge(selected.birthdate)} />
            <InfoRow label="Current Address"  value={selected.purok?.name ?? "—"} />
          </div>

          {/* Other Information */}
          <div className="mb-5 pt-4 border-t border-[#E9EAEC]">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-2">
              Other Information
            </p>
            <InfoRow label="Sector"      value={selected.sector ?? "N/A"} />
            <InfoRow label="CR"          value={selected.household?.comfort_room} />
            <InfoRow label="House"       value={selected.household?.housing_type} />
            <InfoRow label="Water Source" value={selected.household?.water_source} />
            <div className="flex gap-2 py-1 items-center justify-between">
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide min-w-40 shrink-0">
                  No. House of Member
                </span>
                <span className="text-[11px] text-[#374151]">: {selected.household?.members?.length ?? "—"}</span>
              </div>
              {selected.household && (
                <button
                  onClick={() => router.push(`/households/${selected.household!.id}`)}
                  className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition uppercase tracking-wide"
                >
                  View Member
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[#E9EAEC]">
            <button
              onClick={() => router.push(`/residents/${selected.id}/edit`)}
              className="text-[11px] font-bold text-[#6B7280] hover:text-[#1F2937] transition uppercase tracking-wide"
            >
              Edit
            </button>
            <button
              onClick={() => router.push(`/residents/${selected.id}`)}
              className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition uppercase tracking-wide"
            >
              More Info.
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-[#E9EAEC] flex items-center justify-center">
          <p className="text-[#9CA3AF] text-sm">Select a resident to view details</p>
        </div>
      )}
    </div>
  );
}