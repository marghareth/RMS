"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Syringe, User,
  CalendarDays, ChevronRight, ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Vaccination {
  id:           number;
  vaccine_name: string;
  date_given:   string;
  resident: { id: number; fname: string; lname: string; purok?: { name: string } | null };
  recorder: { username: string };
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_VACCINATIONS: Vaccination[] = [
  { id: 1,  vaccine_name: "BCG",                 date_given: "2023-03-10", resident: { id: 5,  fname: "Nino",    lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 2,  vaccine_name: "DPT (1st dose)",      date_given: "2023-04-10", resident: { id: 5,  fname: "Nino",    lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 3,  vaccine_name: "DPT (2nd dose)",      date_given: "2023-05-10", resident: { id: 5,  fname: "Nino",    lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 4,  vaccine_name: "COVID-19 (1st dose)", date_given: "2026-01-15", resident: { id: 9,  fname: "Teresa",  lname: "Ramos",    purok: { name: "Purok II"  } }, recorder: { username: "bhw_lena" } },
  { id: 5,  vaccine_name: "COVID-19 (2nd dose)", date_given: "2026-02-15", resident: { id: 9,  fname: "Teresa",  lname: "Ramos",    purok: { name: "Purok II"  } }, recorder: { username: "bhw_lena" } },
  { id: 6,  vaccine_name: "COVID-19 Booster",    date_given: "2026-04-10", resident: { id: 9,  fname: "Teresa",  lname: "Ramos",    purok: { name: "Purok II"  } }, recorder: { username: "bhw_lena" } },
  { id: 7,  vaccine_name: "Influenza",           date_given: "2026-04-20", resident: { id: 10, fname: "Roberto", lname: "Aquino",   purok: { name: "Purok III" } }, recorder: { username: "bhw_ana"  } },
  { id: 8,  vaccine_name: "Hepatitis B (1st)",   date_given: "2026-05-05", resident: { id: 2,  fname: "Maria",   lname: "Santos",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_lena" } },
  { id: 9,  vaccine_name: "Hepatitis B (2nd)",   date_given: "2026-06-05", resident: { id: 2,  fname: "Maria",   lname: "Santos",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_lena" } },
  { id: 10, vaccine_name: "Tetanus Toxoid",      date_given: "2026-06-01", resident: { id: 3,  fname: "Rosa",    lname: "Reyes",    purok: { name: "Purok III" } }, recorder: { username: "bhw_ana"  } },
  { id: 11, vaccine_name: "MMR",                 date_given: "2023-06-10", resident: { id: 5,  fname: "Nino",    lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
  { id: 12, vaccine_name: "OPV (1st dose)",      date_given: "2023-04-10", resident: { id: 5,  fname: "Nino",    lname: "Flores",   purok: { name: "Purok I"   } }, recorder: { username: "bhw_ana"  } },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Unique residents vaccinated
const uniqueResidents = new Set(MOCK_VACCINATIONS.map(v => v.resident.id)).size;

// Group vaccines by category
const VACCINE_GROUPS: Record<string, string> = {
  BCG: "EPI",
  "DPT (1st dose)": "EPI", "DPT (2nd dose)": "EPI", "DPT (3rd dose)": "EPI",
  "OPV (1st dose)": "EPI", "OPV (2nd dose)": "EPI", "OPV (3rd dose)": "EPI",
  MMR: "EPI",
  "Hepatitis B (1st)": "EPI", "Hepatitis B (2nd)": "EPI", "Hepatitis B (3rd)": "EPI",
  "COVID-19 (1st dose)": "COVID-19", "COVID-19 (2nd dose)": "COVID-19", "COVID-19 Booster": "COVID-19",
  Influenza: "Other", "Tetanus Toxoid": "Other", Typhoid: "Other",
  Rabies: "Other", Varicella: "Other", Pneumococcal: "Other",
};

const GROUP_COLORS: Record<string, string> = {
  "EPI":     "bg-blue-100 text-blue-700",
  "COVID-19":"bg-purple-100 text-purple-700",
  "Other":   "bg-green-100 text-green-700",
};

function VaccineBadge({ name }: { name: string }) {
  const group = VACCINE_GROUPS[name] ?? "Other";
  const cls = GROUP_COLORS[group] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>
      {group}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function VaccinationsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    fetch(`/api/health/vaccinations?${params}`)
      .then(r => r.json())
      .then(d => setVaccinations(d.vaccinations ?? []))
      .finally(() => setLoading(false));
  }, [search]);
  

  

  return (
    <div>
      <PageHeader
        title="Vaccinations"
        subtitle="Vaccination records for all residents"
        actions={
          <button
            onClick={() => router.push("/health/vaccinations/new")}
            className="flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={14} />
            Add Vaccination
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="Total Vaccinations"    value={MOCK_VACCINATIONS.length} sub="All records" icon={Syringe}    color="blue"  />
        <StatCard label="Residents Vaccinated"  value={uniqueResidents}          sub="Unique residents" icon={User} color="green" />
        <StatCard label="This Month"            value={MOCK_VACCINATIONS.filter(v => new Date(v.date_given) >= new Date("2026-06-01")).length} sub="June 2026" icon={ShieldCheck} color="amber" />
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resident name or vaccine..."
            className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {/* Header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_0.5fr] gap-4 border-b border-[#E9EAEC] bg-[#F9FAFB] px-5 py-2.5">
          {["Resident", "Vaccine", "Category", "Date Given", "Recorded By", ""].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">{h}</span>
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
              className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_0.5fr] gap-4 items-center border-b border-[#F4F5F7] px-5 py-3.5 transition hover:bg-[#F9FAFB] ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}
            >
              {/* Resident */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <User size={12} className="text-[#3B82F6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#1F2937] truncate">
                    {v.resident.lname}, {v.resident.fname}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF]">{v.resident.purok?.name ?? "—"}</p>
                </div>
              </div>

              {/* Vaccine */}
              <div className="flex items-center gap-2">
                <Syringe size={12} className="text-[#3B82F6] shrink-0" />
                <p className="text-[12px] font-semibold text-[#1F2937] truncate">{v.vaccine_name}</p>
              </div>

              {/* Category */}
              <VaccineBadge name={v.vaccine_name} />

              {/* Date */}
              <div className="flex items-center gap-1">
                <CalendarDays size={11} className="text-[#9CA3AF] shrink-0" />
                <span className="text-[11px] text-[#6B7280]">{fmtDate(v.date_given)}</span>
              </div>

              {/* Recorder */}
              <span className="text-[11px] text-[#9CA3AF]">{v.recorder.username}</span>

              {/* Action */}
              <button
                onClick={() => router.push(`/health/vaccinations/${v.id}`)}
                className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}