"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Users, SlidersHorizontal, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getMockRegistries,
  addMockRegistry,
  type RegistryEntry,
} from "@/lib/mockRegistries";
import { getMockResidents, getMockPuroks, type Resident } from "@/lib/mockResidents";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type RegistryType = "SENIOR_CITIZEN" | "PWD" | "FOUR_PS";

interface RegistryManagerProps {
  registryType: RegistryType;
  title:        string;
  subtitle:     string;
  icon:         LucideIcon;
  iconBg:       string;
  addNote?:     string;
  minAge?:      number;
  detailBase:   string; // e.g. "/registries/senior-citizens"
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fullName(r: Resident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mid = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mid}`;
}

const PWD_TYPES = [
  "Visual Impairment", "Hearing Impairment", "Physical Disability",
  "Intellectual", "Psychosocial", "Learning", "Other",
];

// ─── ADD MODAL ────────────────────────────────────────────────────────────────
function AddModal({
  registryType, onClose, onAdded,
}: {
  registryType: RegistryType;
  onClose:      () => void;
  onAdded:      (entry: RegistryEntry) => void;
}) {
  const [residentId,    setResidentId]    = useState("");
  const [disabilityType,setDisabilityType]= useState("");
  const [residentSearch,setResidentSearch]= useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const allResidents = getMockResidents().filter(r => !r.is_archived);
  const filtered     = allResidents.filter(r =>
    `${r.fname} ${r.lname}`.toLowerCase().includes(residentSearch.toLowerCase())
  );
  const selected = allResidents.find(r => String(r.id) === residentId);

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  async function handleSave() {
    if (!residentId) { setError("Please select a resident."); return; }
    if (registryType === "PWD" && !disabilityType) { setError("Please specify disability type."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/registries", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id:      parseInt(residentId),
          registry_type:    registryType,
          disability_type:  registryType === "PWD" ? disabilityType : null,
          is_4ps_beneficiary: registryType === "FOUR_PS",
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const entry = await res.json();
      onAdded(entry);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
  ─────────────────────────────────────────────────────────────────────────── */

  // ── Mock save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!residentId) { setError("Please select a resident."); return; }
    if (registryType === "PWD" && !disabilityType) { setError("Please specify the disability type."); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const existing = getMockRegistries();
    const newEntry: RegistryEntry = {
      id:                 (existing[existing.length - 1]?.id ?? 0) + 1,
      resident_id:        parseInt(residentId),
      registry_type:      registryType,
      disability_type:    registryType === "PWD" ? disabilityType : null,
      is_4ps_beneficiary: registryType === "FOUR_PS",
      registered_at:      new Date().toISOString(),
      resident:           selected!,
    };
    addMockRegistry(newEntry);
    setSaving(false);
    onAdded(newEntry);
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9EAEC]">
          <p className="text-[14px] font-black text-[#1F2937] uppercase tracking-wide">Add to Registry</p>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Resident search */}
          <div>
            <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
              Select Resident <span className="text-red-500">*</span>
            </label>
            {selected ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#3B82F6] bg-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 text-[11px] font-black text-white">
                    {selected.fname[0]}{selected.lname[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1F2937]">{fullName(selected)}</p>
                    <p className="text-[11px] text-[#6B7280]">{selected.purok?.name} · Age {calcAge(selected.birthdate)}</p>
                  </div>
                </div>
                <button onClick={() => setResidentId("")} className="text-[11px] font-bold text-[#3B82F6]">Change</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    value={residentSearch}
                    onChange={e => setResidentSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full pl-8 pr-3 py-2.5 text-[12px] border border-[#E9EAEC] rounded-xl focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937] placeholder:text-[#9CA3AF]"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-[#E9EAEC]">
                  {filtered.slice(0, 8).map(r => (
                    <button
                      key={r.id}
                      onClick={() => setResidentId(String(r.id))}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#F4F5F7] border-b border-[#F9FAFB] last:border-0 transition"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 text-[10px] font-black text-[#3B82F6]">
                        {r.fname[0]}{r.lname[0]}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-[#1F2937]">{fullName(r)}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{r.purok?.name} · Age {calcAge(r.birthdate)}</p>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-[12px] text-[#9CA3AF] py-4">No residents found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PWD disability type */}
          {registryType === "PWD" && (
            <div>
              <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
                Disability Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PWD_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDisabilityType(type)}
                    className={`text-left px-3 py-2 rounded-xl border-2 text-[11px] font-semibold transition
                      ${disabilityType === type
                        ? "border-[#3B82F6] bg-blue-50 text-[#3B82F6]"
                        : "border-[#E9EAEC] text-[#6B7280] hover:border-[#D1D5DB]"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#E9EAEC] bg-[#F9FAFB]">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-white transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !residentId}
            className="flex-1 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-[13px] font-bold transition">
            {saving ? "Saving…" : "Add to Registry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RegistryManager({
  registryType, title, subtitle, icon: Icon, iconBg,
  addNote, minAge, detailBase,
}: RegistryManagerProps) {
  const router = useRouter();
  const [search,     setSearch]     = useState("");
  const [purokFilter,setPurokFilter]= useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [entries,    setEntries]    = useState<RegistryEntry[]>(() => {
    return getMockRegistries().filter(e => e.registry_type === registryType);
  });

  const puroks = getMockPuroks();

  // Re-read from mock store when modal closes
  function refreshEntries() {
    setEntries(getMockRegistries().filter(e => e.registry_type === registryType));
  }

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const q   = search.toLowerCase();
      const hit = !q || `${e.resident.fname} ${e.resident.lname}`.toLowerCase().includes(q);
      const pu  = !purokFilter || String(e.resident.purok_id) === purokFilter;
      return hit && pu;
    });
  }, [entries, search, purokFilter]);

  const activeFilters = [purokFilter].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">{title}</h1>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-bold transition shadow-sm"
        >
          <Plus size={14} />
          Add to Registry
        </button>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3">
          <p className="text-[26px] font-black text-[#1F2937] leading-none">{entries.length}</p>
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mt-0.5">Total Registered</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3">
          <p className="text-[26px] font-black text-[#1F2937] leading-none">
            {new Set(entries.map(e => e.resident.purok_id)).size}
          </p>
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mt-0.5">Puroks Covered</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3">
          <p className="text-[26px] font-black text-[#1F2937] leading-none">
            {entries.filter(e => {
              const d = new Date(e.registered_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </p>
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mt-0.5">Added This Month</p>
        </div>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resident name..."
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
          <div className="border-t border-[#E9EAEC] px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1F2937] uppercase tracking-widest">Filters</span>
              <button onClick={() => setShowFilter(false)} className="text-[#9CA3AF] hover:text-[#6B7280]"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide block mb-1">Purok</label>
                <select value={purokFilter} onChange={e => setPurokFilter(e.target.value)}
                  className="w-full text-[11px] border border-[#E9EAEC] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#3B82F6] bg-white">
                  <option value="">All Puroks</option>
                  {puroks.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPurokFilter("")}
                className="flex-1 text-[11px] py-1.5 rounded-lg border border-[#E9EAEC] text-[#6B7280] hover:bg-[#F4F5F7] transition">
                Clear
              </button>
              <button onClick={() => setShowFilter(false)}
                className="flex-1 text-[11px] py-1.5 rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563EB] transition font-semibold">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden flex-1">

        {/* Table header */}
        <div className={`grid gap-4 px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E9EAEC]
          ${registryType === "PWD" ? "grid-cols-[2fr_1fr_1.5fr_1fr_1fr_0.4fr]" : "grid-cols-[2fr_1fr_1fr_1fr_0.4fr]"}`}>
          {[
            "Name",
            "Sex",
            ...(registryType === "PWD" ? ["Disability Type"] : []),
            "Purok",
            "Registered",
            "",
          ].map(h => (
            <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center">
              <Users size={20} className="text-[#D1D5DB]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#6B7280]">No records found</p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                {addNote ?? "Add a resident to this registry to get started."}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <button
              key={entry.id}
              onClick={() => router.push(`${detailBase}/${entry.id}`)}
              className={`w-full text-left grid gap-4 px-5 py-3.5 items-center border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition group last:border-0
                ${registryType === "PWD" ? "grid-cols-[2fr_1fr_1.5fr_1fr_1fr_0.4fr]" : "grid-cols-[2fr_1fr_1fr_1fr_0.4fr]"}
                ${i % 2 !== 0 ? "bg-[#FAFAFA]" : "bg-white"}`}
            >
              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 text-[11px] font-black text-[#3B82F6]">
                  {entry.resident.fname[0]}{entry.resident.lname[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#1F2937] truncate">{fullName(entry.resident)}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">Age {calcAge(entry.resident.birthdate)}</p>
                </div>
              </div>

              {/* Sex */}
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit
                ${entry.resident.sex === "MALE" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                {entry.resident.sex === "MALE" ? "Male" : "Female"}
              </span>

              {/* Disability Type (PWD only) */}
              {registryType === "PWD" && (
                <span className="text-[11px] text-[#6B7280]">
                  {entry.disability_type ?? "—"}
                </span>
              )}

              {/* Purok */}
              <span className="text-[12px] text-[#6B7280]">
                {entry.resident.purok?.name ?? "—"}
              </span>

              {/* Registered date */}
              <span className="text-[11px] text-[#9CA3AF]">
                {fmtDate(entry.registered_at)}
              </span>

              {/* Chevron */}
              <div className="flex justify-end">
                <ChevronRight size={16} className="text-[#D1D5DB] group-hover:text-[#3B82F6] transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* ── FAB ── */}
      <div className="fixed bottom-6 right-6 z-10">
        <button
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-lg transition"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* ── Add modal ── */}
      {showAdd && (
        <AddModal
          registryType={registryType}
          onClose={() => setShowAdd(false)}
          onAdded={() => { refreshEntries(); setShowAdd(false); }}
        />
      )}
    </div>
  );
}