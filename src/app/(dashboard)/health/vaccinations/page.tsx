// FILE PATH: src/app/(dashboard)/health/vaccinations/new/page.tsx
// Replace the entire contents of this file with the code below.
//
// WHAT WAS WRONG: same issue as health/new/page.tsx — a local ResidentPicker
// searched a hardcoded MOCK_RESIDENTS array instead of the real database.
// It also preselected a resident from that same mock array when arriving
// via ?resident_id=..., which would silently fail to preselect anything
// real. Fixed by swapping in the shared ResidentPicker
// (src/components/shared/ResidentPicker.tsx) and, when a resident_id is
// passed in the URL, fetching that resident's real record from
// GET /api/residents/[id] to preselect it.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Syringe, Save, User, CalendarDays } from "lucide-react";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface VaccinationForm { resident_id: string; vaccine_name: string; custom_vaccine: string; date_given: string }

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

  const [selectedResident, setSelectedResident] = useState<PickedResident | null>(null);
  const [form,    setForm]    = useState<VaccinationForm>({
    resident_id:    preResidentId ?? "",
    vaccine_name:   "",
    custom_vaccine: "",
    date_given:     new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // If we arrived via ?resident_id=..., look up the real resident record
  // so the picker shows an actual selected resident instead of nothing.
  useEffect(() => {
    if (!preResidentId) return;
    fetch(`/api/residents/${preResidentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSelectedResident(data);
      })
      .catch((e) => console.error(e));
  }, [preResidentId]);

  const set = (k: keyof VaccinationForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleSelectResident(r: PickedResident | null) {
    setSelectedResident(r);
    set("resident_id", r ? String(r.id) : "");
  }

  const finalVaccineName = form.vaccine_name === "Other (specify)" ? form.custom_vaccine : form.vaccine_name;

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

        {/* ── Resident card ──
             NOTE: intentionally no `overflow-hidden` here (unlike the other
             cards below) — ResidentPicker's search-results dropdown is
             absolutely positioned and needs to render outside this card's
             bounds. overflow-hidden would clip it off after ~1 row. */}
        <div className="bg-white rounded-xl border border-[#E9EAEC]">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB] rounded-t-xl">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Resident</p>
            <span className="text-red-500 text-[11px] font-bold ml-1">*</span>
          </div>
          <div className="p-5">
            <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
              Resident <span className="text-red-500">*</span>
            </label>
            <ResidentPicker
              value={selectedResident}
              onChange={handleSelectResident}
              placeholder="Search resident by name..."
            />
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