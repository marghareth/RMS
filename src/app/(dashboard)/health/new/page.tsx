"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Save, User, Search } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Resident { id: number; fname: string; lname: string; purok?: { name: string } | null }

interface HealthForm {
  resident_id: string;
  record_type: string;
  notes:       string;
}

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

const RECORD_TYPES = [
  "Hypertension",
  "Diabetes",
  "Tuberculosis",
  "Prenatal Checkup",
  "Postnatal Checkup",
  "Well-child Checkup",
  "Asthma",
  "Family Planning",
  "Dental Checkup",
  "Eye Checkup",
  "Mental Health",
  "Malnutrition",
  "Malaria",
  "Dengue",
  "COVID-19",
  "Other",
];

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// ─── RESIDENT PICKER ─────────────────────────────────────────────────────────
function ResidentPicker({
  selected, onSelect,
}: {
  selected: Resident | null;
  onSelect: (r: Resident) => void;
}) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);

  const filtered = MOCK_RESIDENTS.filter(r =>
    `${r.fname} ${r.lname}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <FieldLabel required>Resident</FieldLabel>

      {selected ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#3B82F6] bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0">
              <User size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1F2937]">{selected.lname}, {selected.fname}</p>
              <p className="text-[11px] text-[#6B7280]">{selected.purok?.name ?? "—"} · ID #{String(selected.id).padStart(7, "0")}</p>
            </div>
          </div>
          <button
            onClick={() => { setOpen(true); setQuery(""); }}
            className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E9EAEC] hover:border-[#3B82F6] bg-white transition text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#9CA3AF]" />
          </div>
          <span className="text-[13px] text-[#9CA3AF]">Select a resident...</span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="mt-2 bg-white rounded-xl border border-[#E9EAEC] shadow-lg overflow-hidden z-10 relative">
          <div className="p-3 border-b border-[#F4F5F7]">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-[#F4F5F7] rounded-lg border border-transparent focus:outline-none focus:border-[#3B82F6] text-[#1F2937] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF] text-center py-4">No residents found</p>
            ) : (
              filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => { onSelect(r); setOpen(false); setQuery(""); }}
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
              ))
            )}
          </div>
          <div className="p-2 border-t border-[#F4F5F7]">
            <button onClick={() => setOpen(false)} className="w-full py-1.5 text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECORD TYPE GRID ─────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  "Hypertension":       "border-red-200    bg-red-50    text-red-700    hover:border-red-400",
  "Diabetes":           "border-amber-200  bg-amber-50  text-amber-700  hover:border-amber-400",
  "Tuberculosis":       "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400",
  "Prenatal Checkup":   "border-pink-200   bg-pink-50   text-pink-700   hover:border-pink-400",
  "Postnatal Checkup":  "border-pink-200   bg-pink-50   text-pink-700   hover:border-pink-400",
  "Well-child Checkup": "border-green-200  bg-green-50  text-green-700  hover:border-green-400",
  "Asthma":             "border-blue-200   bg-blue-50   text-blue-700   hover:border-blue-400",
  "Family Planning":    "border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400",
};

function RecordTypeGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RECORD_TYPES.map(type => {
        const selected = value === type;
        const base = TYPE_COLORS[type] ?? "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400";
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold uppercase tracking-wide text-center transition
              ${selected ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-sm" : base}`}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function NewHealthRecordPage() {
  const router = useRouter();

  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [form,    setForm]    = useState<HealthForm>({ resident_id: "", record_type: "", notes: "" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: keyof HealthForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleSelectResident(r: Resident) {
    setSelectedResident(r);
    set("resident_id", String(r.id));
  }

  async function handleSave() {
    if (!form.resident_id || !form.record_type) {
      setError("Please select a resident and a record type.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/health", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: parseInt(form.resident_id),
          record_type: form.record_type,
          notes:       form.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save health record");
      router.push("/health");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
 

  const isValid = form.resident_id && form.record_type;

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/health")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
          <ArrowLeft size={18} className="text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Add Health Record</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Record a residents health condition or checkup</p>
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

        {/* ── Record type card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
              <Heart size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Record Type</p>
            <span className="text-red-500 text-[11px] font-bold ml-1">*</span>
          </div>
          <div className="p-5">
            <RecordTypeGrid value={form.record_type} onChange={v => set("record_type", v)} />

            {/* Custom type */}
            {form.record_type === "Other" && (
              <div className="mt-3">
                <FieldLabel required>Specify Record Type</FieldLabel>
                <input
                  value={form.record_type === "Other" ? "" : form.record_type}
                  onChange={e => set("record_type", e.target.value)}
                  placeholder="Enter specific condition or checkup type..."
                  className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Notes card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-[#6B7280] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Notes / Remarks</p>
            <span className="text-[11px] text-[#9CA3AF] font-medium ml-1">(optional)</span>
          </div>
          <div className="p-5">
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Enter findings, recommendations, medications, referrals, or any relevant observations..."
              rows={4}
              className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-3 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition resize-none bg-white"
            />
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 text-right">{form.notes.length} characters</p>
          </div>
        </div>

        {/* Summary preview */}
        {isValid && (
          <div className="px-5 py-4 rounded-xl bg-[#F4F5F7] border border-[#E9EAEC]">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-2">Summary</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Heart size={14} className="text-red-500" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#1F2937]">
                  {form.record_type} — {selectedResident ? `${selectedResident.lname}, ${selectedResident.fname}` : ""}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  {selectedResident?.purok?.name ?? ""} · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
            {saving ? "Saving…" : "Save Health Record"}
          </button>
        </div>
      </div>
    </div>
  );
}