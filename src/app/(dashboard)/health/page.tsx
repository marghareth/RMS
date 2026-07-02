"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Heart, Syringe,
  ChevronRight, User, CalendarDays,
  Activity, ShieldCheck,
} from "lucide-react";

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

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_HEALTH: HealthRecord[] = [
  { id: 1,  resident_id: 1,  record_type: "Hypertension",       notes: "BP: 140/90. Advised lifestyle changes and medication.",  recorded_at: "2026-06-25T08:30:00Z", resident: { id: 1,  fname: "Juan",       lname: "dela Cruz",  purok: { name: "Purok II"  } }, recorder: { username: "bhw_ana"    } },
  { id: 2,  resident_id: 2,  record_type: "Diabetes",           notes: "Blood sugar: 210 mg/dL. Referred to RHU.",              recorded_at: "2026-06-22T10:00:00Z", resident: { id: 2,  fname: "Maria",      lname: "Santos",     purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"    } },
  { id: 3,  resident_id: 3,  record_type: "Prenatal Checkup",   notes: "28 weeks AOG. Normal fetal heart rate.",                recorded_at: "2026-06-20T09:15:00Z", resident: { id: 3,  fname: "Rosa",       lname: "Reyes",      purok: { name: "Purok III" } }, recorder: { username: "bhw_lena"   } },
  { id: 4,  resident_id: 4,  record_type: "Tuberculosis",       notes: "DOTS therapy started. Month 2 of 6.",                   recorded_at: "2026-06-18T11:00:00Z", resident: { id: 4,  fname: "Pedro",      lname: "Garcia",     purok: { name: "Purok IV"  } }, recorder: { username: "bhw_lena"   } },
  { id: 5,  resident_id: 5,  record_type: "Well-child Checkup", notes: "Growth and development on track. 3 years old.",         recorded_at: "2026-06-15T08:00:00Z", resident: { id: 5,  fname: "Nino",       lname: "Flores",     purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"    } },
  { id: 6,  resident_id: 6,  record_type: "Hypertension",       notes: "BP: 150/95. Medications adjusted.",                    recorded_at: "2026-06-10T14:00:00Z", resident: { id: 6,  fname: "Carmen",     lname: "Lopez",      purok: { name: "Purok II"  } }, recorder: { username: "bhw_lena"   } },
  { id: 7,  resident_id: 7,  record_type: "Asthma",             notes: "Nebulization done. Prescribed bronchodilator.",         recorded_at: "2026-06-05T09:30:00Z", resident: { id: 7,  fname: "Fernando",   lname: "Cruz",       purok: { name: "Purok III" } }, recorder: { username: "bhw_ana"    } },
  { id: 8,  resident_id: 8,  record_type: "Family Planning",    notes: "IUD insertion scheduled. Counseling completed.",        recorded_at: "2026-05-30T10:00:00Z", resident: { id: 8,  fname: "Lourdes",    lname: "Mendoza",    purok: { name: "Purok IV"  } }, recorder: { username: "bhw_lena"   } },
];

const MOCK_VACCINATIONS: Vaccination[] = [
  { id: 1,  resident_id: 5,  vaccine_name: "BCG",                date_given: "2023-03-10", resident: { id: 5,  fname: "Nino",     lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 2,  resident_id: 5,  vaccine_name: "DPT (1st dose)",     date_given: "2023-04-10", resident: { id: 5,  fname: "Nino",     lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 3,  resident_id: 5,  vaccine_name: "DPT (2nd dose)",     date_given: "2023-05-10", resident: { id: 5,  fname: "Nino",     lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 4,  resident_id: 9,  vaccine_name: "COVID-19 (1st dose)",date_given: "2026-01-15", resident: { id: 9,  fname: "Teresa",   lname: "Ramos",    purok: { name: "Purok II"  } }, recorder: { username: "bhw_lena" } },
  { id: 5,  resident_id: 9,  vaccine_name: "COVID-19 (2nd dose)",date_given: "2026-02-15", resident: { id: 9,  fname: "Teresa",   lname: "Ramos",    purok: { name: "Purok II"  } }, recorder: { username: "bhw_lena" } },
  { id: 6,  resident_id: 10, vaccine_name: "Influenza",          date_given: "2026-04-20", resident: { id: 10, fname: "Roberto",  lname: "Aquino",   purok: { name: "Purok III" } }, recorder: { username: "bhw_ana"  } },
  { id: 7,  resident_id: 2,  vaccine_name: "Hepatitis B (1st)",  date_given: "2026-05-05", resident: { id: 2,  fname: "Maria",    lname: "Santos",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_lena" } },
  { id: 8,  resident_id: 3,  vaccine_name: "Tetanus Toxoid",     date_given: "2026-06-01", resident: { id: 3,  fname: "Rosa",     lname: "Reyes",    purok: { name: "Purok III" } }, recorder: { username: "bhw_ana"  } },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fullName(r: Resident) { return `${r.lname}, ${r.fname}`; }

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, bg }: {
  label: string; value: number | string;
  icon: any; accent: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={18} className={accent} />
      </div>
      <div>
        <p className="text-[24px] font-black leading-none text-[#1F2937]">{value}</p>
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mt-0.5">{label}</p>
      </div>
    </div>
  );
}

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

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [healthRecords,  setHealthRecords]  = useState<HealthRecord[]>([]);
  const [vaccinations,   setVaccinations]   = useState<Vaccination[]>([]);
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
        setVaccinations(vData.vaccinations ?? []);
      })
      .finally(() => setLoading(false));
  }, [search]);
  ─────────────────────────────────────────────────────────────────────────── */

  // ── Mock filtering ────────────────────────────────────────────────────────
  const healthRecords = MOCK_HEALTH.filter(r =>
    `${r.resident.fname} ${r.resident.lname} ${r.record_type}`
      .toLowerCase().includes(search.toLowerCase())
  );
  const vaccinations = MOCK_VACCINATIONS.filter(v =>
    `${v.resident.fname} ${v.resident.lname} ${v.vaccine_name}`
      .toLowerCase().includes(search.toLowerCase())
  );

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
        <StatCard label="Total Health Records" value={MOCK_HEALTH.length}       icon={Heart}       accent="text-red-500"    bg="bg-red-50"    />
        <StatCard label="Vaccinations Given"   value={MOCK_VACCINATIONS.length} icon={Syringe}     accent="text-[#3B82F6]" bg="bg-blue-50"   />
        <StatCard label="Active Cases"         value={5}                         icon={Activity}    accent="text-amber-600" bg="bg-amber-50"  />
        <StatCard label="Residents Covered"    value={8}                         icon={ShieldCheck} accent="text-green-600" bg="bg-green-50"  />
      </div>

      {/* ── Main content ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <TabBtn label="Health Records" count={MOCK_HEALTH.length}       icon={Heart}   active={tab === "health"}      onClick={() => setTab("health")}      />
            <TabBtn label="Vaccinations"   count={MOCK_VACCINATIONS.length} icon={Syringe} active={tab === "vaccination"} onClick={() => setTab("vaccination")} />
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