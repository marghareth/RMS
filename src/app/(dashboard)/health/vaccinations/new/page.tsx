"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Syringe, Save, User, Search, CalendarDays } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Resident { id: number; fname: string; lname: string; purok?: { name: string } | null }
interface VaccinationForm { resident_id: string; vaccine_name: string; custom_vaccine: string; date_given: string }

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_RESIDENTS: Resident[] = [
  { id: 1,  fname: "Juan",     lname: "dela Cruz", purok: { name: "Purok II"  } },
  { id: 2,  fname: "Maria",    lname: "Santos",    purok: { name: "Purok I"   } },
  { id: 3,  fname: "Rosa",     lname: "Reyes",     purok: { name: "Purok III" } },
  { id: 4,  fname: "Pedro",    lname: "Garcia",    purok: { name: "Purok IV"  } },
  { id: 5,  fname: "Nino",     lname: "Flores",    purok: { name: "Purok I"   } },
  { id: 6,  fname: "Carmen",   lname: "Lopez",     purok: { name: "Purok II"  } },
  { id: 7,  fname: "Fernando", lname: "Cruz",      purok: { name: "Purok III" } },
  { id: 8,  fname: "Lourdes",  lname: "Mendoza",   purok: { name: "Purok IV"  } },
  { id: 9,  fname: "Teresa",   lname: "Ramos",     purok: { name: "Purok II"  } },
  { id: 10, fname: "Roberto",  lname: "Aquino",    purok: { name: "Purok III" } },
];

// Grouped vaccines for the picker
const VACCINE_GROUPS = [
  {
    group: "Routine Immunization (EPI)",
    vaccines: ["BCG", "DPT (1st dose)", "DPT (2nd dose)", "DPT (3rd dose)", "OPV (1st dose)", "OPV (2nd dose)", "OPV (3rd dose)", "MMR", "Hepatitis B (1st)", "Hepatitis B (2nd)", "Hepatitis B (3rd)"],
  },
  {
    group: "COVID-19",
    vaccines: ["COVID-19 (1st dose)", "COVID-19 (2nd dose)", "COVID-19 Booster"],
  },
  {
    group: "Other Vaccines",
    vaccines: ["Influenza", "Tetanus Toxoid", "Rabies", "Typhoid", "Pneumococcal", "Varicella", "Other (specify)"],
  },
];

// ─── RESIDENT PICKER ─────────────────────────────────────────────────────────
function ResidentPicker({ selected, onSelect }: { selected: Resident | null; onSelect: (r: Resident) => void }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const filtered = MOCK_RESIDENTS.filter(r => `${r.fname} ${r.lname}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
        Resident <span className="text-red-500">*</span>
      </label>
      {selected ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#3B82F6] bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0">
              <User size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1F2937]">{selected.lname}, {selected.fname}</p>
              <p className="text-[11px] text-[#6B7280]">{selected.purok?.name ?? "—"}</p>
            </div>
          </div>
          <button onClick={() => { setOpen(true); setQuery(""); }} className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8]">Change</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E9EAEC] hover:border-[#3B82F6] bg-white transition text-left">
          <div className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#9CA3AF]" />
          </div>
          <span className="text-[13px] text-[#9CA3AF]">Select a resident...</span>
        </button>
      )}
      {open && (
        <div className="mt-2 bg-white rounded-xl border border-[#E9EAEC] shadow-lg overflow-hidden z-10 relative">
          <div className="p-3 border-b border-[#F4F5F7]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name..."
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-[#F4F5F7] rounded-lg focus:outline-none focus:border-[#3B82F6] border border-transparent text-[#1F2937] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.map(r => (
              <button key={r.id} onClick={() => { onSelect(r); setOpen(false); setQuery(""); }}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#F4F5F7] transition border-b border-[#F9FAFB] last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <User size={12} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#1F2937]">{r.lname}, {r.fname}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{r.purok?.name ?? "—"}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-[#F4F5F7]">
            <button onClick={() => setOpen(false)} className="w-full py-1.5 text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VACCINE PICKER ───────────────────────────────────────────────────────────
function VaccinePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      {VACCINE_GROUPS.map(g => (
        <div key={g.group}>
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">{g.group}</p>
          <div className="flex flex-wrap gap-2">
            {g.vaccines.map(v => {
              const selected = value === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange(v)}
                  className={`px-3 py-2 rounded-xl border-2 text-[11px] font-bold transition
                    ${selected
                      ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-sm"
                      : "border-[#E9EAEC] bg-white text-[#6B7280] hover:border-[#3B82F6] hover:text-[#3B82F6]"}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function NewVaccinationPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const preResidentId = searchParams.get("resident_id");

  const preResident = preResidentId
    ? MOCK_RESIDENTS.find(r => String(r.id) === preResidentId) ?? null
    : null;

  const [selectedResident, setSelectedResident] = useState<Resident | null>(preResident);
  const [form,    setForm]    = useState<VaccinationForm>({
    resident_id:    preResidentId ?? "",
    vaccine_name:   "",
    custom_vaccine: "",
    date_given:     new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof VaccinationForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleSelectResident(r: Resident) {
    setSelectedResident(r);
    set("resident_id", String(r.id));
  }

  const finalVaccineName = form.vaccine_name === "Other (specify)" ? form.custom_vaccine : form.vaccine_name;

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  async function handleSave() {
    if (!form.resident_id || !finalVaccineName || !form.date_given) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/health/vaccinations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id:  parseInt(form.resident_id),
          vaccine_name: finalVaccineName,
          date_given:   form.date_given,
        }),
      });
      if (!res.ok) throw new Error("Failed to save vaccination");
      router.push("/health");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
  ─────────────────────────────────────────────────────────────────────────── */

  async function handleSave() {
    if (!form.resident_id || !finalVaccineName || !form.date_given) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    router.push("/health");
  }

  const isValid = form.resident_id && finalVaccineName && form.date_given;

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/health")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
          <ArrowLeft size={18} className="text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Add Vaccination</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Record a vaccination administered to a resident</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Resident card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Resident</p>
          </div>
          <div className="p-5">
            <ResidentPicker selected={selectedResident} onSelect={handleSelectResident} />
          </div>
        </div>

        {/* ── Vaccine picker card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <Syringe size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Vaccine</p>
            <span className="text-red-500 text-[11px] font-bold ml-1">*</span>
          </div>
          <div className="p-5">
            <VaccinePicker value={form.vaccine_name} onChange={v => set("vaccine_name", v)} />

            {/* Custom vaccine input */}
            {form.vaccine_name === "Other (specify)" && (
              <div className="mt-4">
                <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
                  Specify Vaccine Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.custom_vaccine}
                  onChange={e => set("custom_vaccine", e.target.value)}
                  placeholder="Enter vaccine name..."
                  className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Date card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <CalendarDays size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Date Given</p>
            <span className="text-red-500 text-[11px] font-bold ml-1">*</span>
          </div>
          <div className="p-5">
            <input
              type="date"
              value={form.date_given}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => set("date_given", e.target.value)}
              className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] bg-white"
            />
          </div>
        </div>

        {/* Summary preview */}
        {isValid && (
          <div className="px-5 py-4 rounded-xl bg-[#EFF6FF] border border-blue-100">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-2">Summary</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0">
                <Syringe size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#1F2937]">
                  {finalVaccineName} — {selectedResident ? `${selectedResident.lname}, ${selectedResident.fname}` : ""}
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  {selectedResident?.purok?.name ?? ""} · {form.date_given ? new Date(form.date_given + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-[12px] text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3 pb-6">
          <button onClick={() => router.push("/health")} className="flex-1 py-3 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Vaccination"}
          </button>
        </div>
      </div>
    </div>
  );
}