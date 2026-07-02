"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Package, Save, User, CalendarDays } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Equipment { id: number; name: string; quantity: number; status: string }

interface BorrowForm {
  equipment_id:    string;
  borrower_name:   string;
  resident_id:     string;  // optional — link to resident in RBI
  date_borrowed:   string;
  expected_return: string;
  notes:           string;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_EQUIPMENT: Equipment[] = [
  { id: 1, name: "Megaphone",       quantity: 3,  status: "SERVICEABLE" },
  { id: 2, name: "Plastic Chairs",  quantity: 50, status: "SERVICEABLE" },
  { id: 3, name: "Folding Tables",  quantity: 10, status: "SERVICEABLE" },
  { id: 5, name: "Tarpaulin Stand", quantity: 4,  status: "SERVICEABLE" },
  { id: 6, name: "Sound System",    quantity: 1,  status: "SERVICEABLE" },
  { id: 8, name: "First Aid Kit",   quantity: 5,  status: "SERVICEABLE" },
];

const MOCK_RESIDENTS = [
  { id: 1,  name: "Juan dela Cruz"  },
  { id: 2,  name: "Maria Santos"    },
  { id: 3,  name: "Pedro Reyes"     },
  { id: 4,  name: "Ana Garcia"      },
  { id: 5,  name: "Jose Flores"     },
];

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[10px] text-[#9CA3AF]">{hint}</span>}
    </div>
  );
}

function SelectInput({
  label, value, onChange, options, required, hint, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean; hint?: string; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required} hint={hint}>{label}</FieldLabel>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] pr-8 bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[10px]">▼</span>
      </div>
    </div>
  );
}

function TextInput({
  label, value, onChange, placeholder, required, hint, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; hint?: string; type?: string;
}) {
  return (
    <div>
      <FieldLabel required={required} hint={hint}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        min={type === "date" ? new Date().toISOString().split("T")[0] : undefined}
        className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition bg-white"
      />
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function BorrowEquipmentPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const preselected  = searchParams.get("equipment_id") ?? "";

  const today    = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState<BorrowForm>({
    equipment_id:    preselected,
    borrower_name:   "",
    resident_id:     "",
    date_borrowed:   today,
    expected_return: nextWeek,
    notes:           "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof BorrowForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  // When a resident is selected, auto-fill borrower name
  useEffect(() => {
    if (form.resident_id) {
      const r = MOCK_RESIDENTS.find(r => String(r.id) === form.resident_id);
      if (r) set("borrower_name", r.name);
    }
  }, [form.resident_id]);

  const selectedEquipment = MOCK_EQUIPMENT.find(e => String(e.id) === form.equipment_id);

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  async function handleSave() {
    if (!form.equipment_id || !form.borrower_name || !form.date_borrowed || !form.expected_return) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.expected_return < form.date_borrowed) {
      setError("Expected return date must be after the borrow date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/equipment/borrowings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id:    parseInt(form.equipment_id),
          borrower_name:   form.borrower_name,
          resident_id:     form.resident_id ? parseInt(form.resident_id) : null,
          date_borrowed:   form.date_borrowed,
          expected_return: form.expected_return,
        }),
      });
      if (!res.ok) throw new Error("Failed to record borrowing");
      router.push("/equipment");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
  ─────────────────────────────────────────────────────────────────────────── */

  // ── Mock save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.equipment_id || !form.borrower_name || !form.date_borrowed || !form.expected_return) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.expected_return < form.date_borrowed) {
      setError("Expected return date must be after the borrow date.");
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    router.push("/equipment");
  }

  const isValid = form.equipment_id && form.borrower_name && form.date_borrowed && form.expected_return;

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/equipment")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
        >
          <ArrowLeft size={18} className="text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Lend Out Equipment</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Record a new equipment borrowing</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Equipment selection card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Equipment</p>
          </div>
          <div className="p-5">
            <SelectInput
              label="Select Equipment"
              value={form.equipment_id}
              onChange={v => set("equipment_id", v)}
              options={MOCK_EQUIPMENT.map(e => ({ value: String(e.id), label: `${e.name} (Qty: ${e.quantity})` }))}
              required
            />

            {/* Equipment preview */}
            {selectedEquipment && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0">
                  <Package size={16} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1F2937]">{selectedEquipment.name}</p>
                  <p className="text-[11px] text-[#6B7280]">
                    Qty: {selectedEquipment.quantity} · Status: {selectedEquipment.status}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Borrower card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Borrower Information</p>
          </div>
          <div className="p-5 space-y-4">

            {/* Link to resident (optional) */}
            <SelectInput
              label="Link to Resident (optional)"
              value={form.resident_id}
              onChange={v => set("resident_id", v)}
              options={MOCK_RESIDENTS.map(r => ({ value: String(r.id), label: r.name }))}
              hint="Auto-fills name below"
            />

            {/* Borrower name */}
            <TextInput
              label="Borrower Name"
              value={form.borrower_name}
              onChange={v => set("borrower_name", v)}
              placeholder="Full name of the borrower"
              required
            />
          </div>
        </div>

        {/* ── Schedule card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <CalendarDays size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Schedule</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Date Borrowed"
                value={form.date_borrowed}
                onChange={v => set("date_borrowed", v)}
                type="date"
                required
              />
              <TextInput
                label="Expected Return"
                value={form.expected_return}
                onChange={v => set("expected_return", v)}
                type="date"
                required
              />
            </div>

            {/* Duration preview */}
            {form.date_borrowed && form.expected_return && form.expected_return >= form.date_borrowed && (
              <div className="px-4 py-2.5 rounded-xl bg-green-50 border border-green-100">
                <p className="text-[12px] text-green-700 font-medium">
                  Duration:{" "}
                  {Math.round(
                    (new Date(form.expected_return).getTime() - new Date(form.date_borrowed).getTime()) / 86400000
                  )}{" "}
                  day(s)
                </p>
              </div>
            )}
            {form.date_borrowed && form.expected_return && form.expected_return < form.date_borrowed && (
              <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
                <p className="text-[12px] text-red-600 font-medium">
                  Return date must be after the borrow date.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-[12px] text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={() => router.push("/equipment")}
            className="flex-1 py-3 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <Save size={14} />
            {saving ? "Recording…" : "Record Borrowing"}
          </button>
        </div>
      </div>
    </div>
  );
}