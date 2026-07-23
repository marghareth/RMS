// FILE PATH: src/app/(dashboard)/health/page.tsx
// Replace the entire contents of this file with the code below.
//
// WHAT WAS WRONG: the table rows themselves already used real data from
// /api/health and /api/health/vaccinations. But:
//   1. The 4 stat cards at the top and the 2 tab-count badges used
//      MOCK_HEALTH.length / MOCK_VACCINATIONS.length (both hardcoded to 8
//      fake records) instead of the real fetched counts — that's why the
//      numbers looked plausible but weren't actually derived from the DB.
//   2. "Active Cases" (5) and "Residents Covered" (8) were literal
//      hardcoded numbers, not computed at all.
//   3. The search box sent ?search=... but /api/health and
//      /api/health/vaccinations ignored that param entirely (fixed
//      separately in the two route.ts files).
//
// FIX: removed MOCK_HEALTH / MOCK_VACCINATIONS completely. Total Health
// Records and Vaccinations Given now come straight from the API's `total`
// field (the true DB count, not just the current page). Residents Covered
// is the number of distinct residents appearing in either list. Active
// Cases has no dedicated status field in the schema (HealthRecord has no
// "resolved/ongoing" column) — as a stand-in, it counts records whose
// record_type is one of a defined set of ongoing/chronic conditions
// (see ONGOING_TYPES below). This is a heuristic, not a true DB field —
// flagging this so you can adjust the list or add a real status column
// if you want this number to mean something more precise.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Heart, Syringe,
  ChevronRight, User, CalendarDays,
  Activity, ShieldCheck,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Resident { id: number; fname: string; lname: string; purok?: { name: string } | null }

interface HealthRecord {
  id:          number;
  resident_id: number;
  record_type: string;
  notes:       string | null;
  recorded_at: string;
  resident:    Resident;
  recorder:    { username: string };
}

interface Vaccination {
  id:           number;
  resident_id:  number;
  vaccine_name: string;
  date_given:   string;
  resident:     Resident;
  recorder:     { username: string };
}

// Record types treated as "ongoing / chronic" for the Active Cases stat.
// The schema has no status field on HealthRecord, so this is a heuristic —
// adjust this list (or better, add a real status column) if it doesn't
// match how your barangay actually tracks ongoing cases.
const ONGOING_TYPES = new Set([
  "Hypertension",
  "Diabetes",
  "Tuberculosis",
  "Asthma",
  "Mental Health",
  "Malnutrition",
  "Malaria",
  "Dengue",
  "COVID-19",
]);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fullName(r: Resident) { return `${r.lname}, ${r.fname}`; }

// ─── RECORD TYPE BADGE ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Hypertension":       { bg: "bg-red-100",    text: "text-red-700"    },
  "Diabetes":           { bg: "bg-amber-100",  text: "text-amber-700"  },
  "Tuberculosis":       { bg: "bg-orange-100", text: "text-orange-700" },
  "Prenatal Checkup":   { bg: "bg-pink-100",   text: "text-pink-700"   },
  "Well-child Checkup": { bg: "bg-green-100",  text: "text-green-700"  },
  "Asthma":             { bg: "bg-blue-100",   text: "text-blue-700"   },
  "Family Planning":    { bg: "bg-purple-100", text: "text-purple-700" },
};

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${c.bg} ${c.text}`}>
      {type}
    </span>
  );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────────────────
function TabBtn({ label, count, active, onClick, icon: Icon }: {
  label: string; count: number; active: boolean; onClick: () => void; icon: any;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition
        ${active ? "bg-[#3B82F6] text-white shadow-sm" : "text-[#6B7280] hover:bg-[#F4F5F7]"}`}
    >
      <Icon size={14} />
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
        ${active ? "bg-blue-400 text-white" : "bg-[#E9EAEC] text-[#6B7280]"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HealthPage() {
  const router = useRouter();
  const [tab,    setTab]    = useState<"health" | "vaccination">("health");
  const [search, setSearch] = useState("");

  const [healthRecords,  setHealthRecords]  = useState<HealthRecord[]>([]);
  const [vaccinations,   setVaccinations]   = useState<Vaccination[]>([]);
  const [healthTotal,    setHealthTotal]    = useState(0);
  const [vaccinationTotal, setVaccinationTotal] = useState(0);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    Promise.all([
      fetch(`/api/health?${params}`).then(r => r.json()),
      fetch(`/api/health/vaccinations?${params}`).then(r => r.json()),
    ])
      .then(([hData, vData]) => {
        setHealthRecords(hData.records ?? []);
        setHealthTotal(hData.total ?? (hData.records ?? []).length);
        setVaccinations(vData.vaccinations ?? []);
        setVaccinationTotal(vData.total ?? (vData.vaccinations ?? []).length);
      })
      .finally(() => setLoading(false));
  }, [search]);

  // Distinct residents touched by either a health record or a vaccination
  // (based on the currently loaded page of up to 50 of each — accurate for
  // typical barangay volumes; raise the `limit` above or add a dedicated
  // /api/health/summary endpoint if you need this to be exact past 50).
  const residentsCovered = new Set([
    ...healthRecords.map(r => r.resident_id),
    ...vaccinations.map(v => v.resident_id),
  ]).size;

  const activeCases = healthRecords.filter(r => ONGOING_TYPES.has(r.record_type)).length;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Health Records</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Community health monitoring and vaccination tracking</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/health/vaccinations/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] text-[#6B7280] text-[13px] font-bold hover:bg-[#F4F5F7] transition"
          >
            <Syringe size={14} />
            Add Vaccination
          </button>
          <button
            onClick={() => router.push("/health/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-bold transition shadow-sm"
          >
            <Plus size={14} />
            Add Health Record
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Health Records" value={healthTotal}       sub="All recorded conditions" icon={Heart}       color="red" />
        <StatCard label="Vaccinations Given"    value={vaccinationTotal} sub="Doses administered"      icon={Syringe}     color="blue" />
        <StatCard label="Active Cases"          value={activeCases}      sub="Ongoing treatment"       icon={Activity}    color="amber" />
        <StatCard label="Residents Covered"     value={residentsCovered} sub="Unique residents"        icon={ShieldCheck} color="green" />
      </div>

      {/* ── Main content ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <TabBtn label="Health Records" count={healthTotal}       icon={Heart}   active={tab === "health"}      onClick={() => setTab("health")}      />
            <TabBtn label="Vaccinations"   count={vaccinationTotal}  icon={Syringe} active={tab === "vaccination"} onClick={() => setTab("vaccination")} />
          </div>
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resident or type..."
              className="w-full pl-9 pr-3 py-2 text-[12px] bg-white border border-[#E9EAEC] rounded-xl focus:outline-none focus:border-[#3B82F6] placeholder:text-[#9CA3AF] text-[#1F2937]"
            />
          </div>
        </div>

        {/* ── HEALTH RECORDS TAB ── */}
        {tab === "health" && (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_2.5fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
              {["Resident", "Record Type", "Notes", "Date", "Action"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {healthRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Heart size={28} className="text-[#D1D5DB]" />
                <p className="text-[13px] text-[#9CA3AF]">No health records found</p>
              </div>
            ) : (
              healthRecords.map((r, i) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[2fr_1.5fr_2.5fr_1fr_1fr] gap-4 px-5 py-3.5 border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition items-center ${i % 2 === 0 ? "" : "bg-[#FAFAFA]"}`}
                >
                  {/* Resident */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                      <User size={12} className="text-[#3B82F6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#1F2937] truncate">{fullName(r.resident)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{r.resident.purok?.name ?? "—"}</p>
                    </div>
                  </div>

                  {/* Type */}
                  <div><TypeBadge type={r.record_type} /></div>

                  {/* Notes */}
                  <p className="text-[11px] text-[#6B7280] line-clamp-2">{r.notes ?? "—"}</p>

                  {/* Date */}
                  <div className="flex items-center gap-1">
                    <CalendarDays size={11} className="text-[#9CA3AF] shrink-0" />
                    <span className="text-[11px] text-[#6B7280]">{fmtDate(r.recorded_at)}</span>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/health/${r.id}`)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition"
                    >
                      View <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── VACCINATIONS TAB ── */}
        {tab === "vaccination" && (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
              {["Resident", "Vaccine", "Date Given", "Recorded By", "Action"].map(h => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {vaccinations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Syringe size={28} className="text-[#D1D5DB]" />
                <p className="text-[13px] text-[#9CA3AF]">No vaccination records found</p>
              </div>
            ) : (
              vaccinations.map((v, i) => (
                <div
                  key={v.id}
                  className={`grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-3.5 border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition items-center ${i % 2 === 0 ? "" : "bg-[#FAFAFA]"}`}
                >
                  {/* Resident */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                      <User size={12} className="text-[#3B82F6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#1F2937] truncate">{fullName(v.resident)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{v.resident.purok?.name ?? "—"}</p>
                    </div>
                  </div>

                  {/* Vaccine */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Syringe size={11} className="text-[#3B82F6]" />
                    </div>
                    <p className="text-[12px] font-semibold text-[#1F2937] truncate">{v.vaccine_name}</p>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1">
                    <CalendarDays size={11} className="text-[#9CA3AF] shrink-0" />
                    <span className="text-[11px] text-[#6B7280]">{fmtDate(v.date_given)}</span>
                  </div>

                  {/* Recorded by */}
                  <p className="text-[11px] text-[#9CA3AF]">{v.recorder.username}</p>

                  {/* Action */}
                  <button
                    onClick={() => router.push(`/health/vaccinations/${v.id}`)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition"
                  >
                    View <ChevronRight size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}