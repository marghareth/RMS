// FILE: src/app/(dashboard)/equipment/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Save } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type EquipmentStatus = "SERVICEABLE" | "UNSERVICEABLE" | "MISSING";

interface EquipmentForm {
  name:          string;
  quantity:      string;
  condition:     string;
  status:        EquipmentStatus;
  date_acquired: string;
  asset_type:    string;
  serial_number: string;
  image_url:     string;
  purchase_cost: string;
  current_value: string;
  purchase_date: string;
  assigned_to:   string;
  location:      string;
  description:   string;
}

const CONDITION_OPTIONS = [
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "NEEDS_REPAIR", label: "Needs Repair" },
  { value: "DECOMMISSIONED", label: "Decommissioned" },
];

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] uppercase tracking-wide block mb-1.5">
      {children}{required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full text-[13px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-blue-50 text-[#1F2937] dark:text-white placeholder:text-[#D1D5DB] dark:placeholder:text-[#525252] transition bg-white dark:bg-[#171717]"
      />
    </div>
  );
}

function SelectInput({
  label, value, onChange, options, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-[13px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-blue-50 text-[#1F2937] dark:text-white pr-8 bg-white dark:bg-[#171717] transition"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3] text-[10px]">▼</span>
      </div>
    </div>
  );
}

// ─── STATUS OPTION CARD ───────────────────────────────────────────────────────
function StatusOption({
  value, label, description, color, selected, onClick,
}: {
  value: EquipmentStatus; label: string; description: string;
  color: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left px-4 py-3 rounded-xl border-2 transition
        ${selected
          ? `border-[#3B82F6] dark:border-[#60A5FA] bg-blue-50 dark:bg-blue-500/15`
          : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] hover:border-[#D1D5DB] dark:hover:border-[#404040]"}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className={`text-[12px] font-bold uppercase tracking-wide ${selected ? "text-[#3B82F6] dark:text-[#60A5FA]" : "text-[#1F2937] dark:text-white"}`}>
          {label}
        </span>
      </div>
      <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] pl-4">{description}</p>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function NewEquipmentPage() {
  const router = useRouter();

  const [form, setForm] = useState<EquipmentForm>({
    name: "", quantity: "1", condition: "", status: "SERVICEABLE", date_acquired: "",
    asset_type: "", serial_number: "", image_url: "", purchase_cost: "", current_value: "",
    purchase_date: "", assigned_to: "", location: "", description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof EquipmentForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  
  async function handleSave() {
    if (!form.name.trim() || !form.quantity) {
      setError("Name and quantity are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/equipment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name.trim(),
          quantity:      parseInt(form.quantity),
          condition:     form.condition || null,
          status:        form.status,
          date_acquired: form.date_acquired || null,
          asset_type:    form.asset_type || null,
          serial_number: form.serial_number || null,
          image_url:     form.image_url || null,
          purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
          current_value: form.current_value ? parseFloat(form.current_value) : null,
          purchase_date: form.purchase_date || null,
          assigned_to:   form.assigned_to || null,
          location:      form.location || null,
          description:   form.description || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save equipment");
      router.push("/equipment");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
 

  const isValid = form.name.trim() && parseInt(form.quantity) > 0;

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/equipment")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
        >
          <ArrowLeft size={18} className="text-[#6B7280] dark:text-[#A3A3A3]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] dark:text-white uppercase tracking-wide">Add Equipment</h1>
          <p className="text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3] mt-0.5">Register a new item to the inventory</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
          <div className="w-9 h-9 rounded-xl bg-[#3B82F6] flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#1F2937] dark:text-white">Equipment Details</p>
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Fill in the information below</p>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Name */}
          <TextInput
            label="Equipment Name"
            value={form.name}
            onChange={v => set("name", v)}
            placeholder="e.g. Megaphone, Folding Tables, Generator"
            required
          />

          {/* Quantity + Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Quantity</FieldLabel>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => set("quantity", e.target.value)}
                className="w-full text-[13px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-blue-50 text-[#1F2937] dark:text-white transition bg-white dark:bg-[#171717]"
              />
            </div>
            <SelectInput
              label="Condition"
              value={form.condition}
              onChange={v => set("condition", v)}
              options={CONDITION_OPTIONS}
            />
          </div>

          {/* Type + Serial Number */}
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Type"
              value={form.asset_type}
              onChange={v => set("asset_type", v)}
              placeholder="e.g. Furniture, Electronics, Tools"
            />
            <TextInput
              label="Serial Number"
              value={form.serial_number}
              onChange={v => set("serial_number", v)}
              placeholder="e.g. SN-00123"
            />
          </div>

          {/* Image URL */}
          <TextInput
            label="Photo URL"
            value={form.image_url}
            onChange={v => set("image_url", v)}
            placeholder="https://…"
          />

          {/* Date Acquired */}
          <TextInput
            label="Date Acquired"
            value={form.date_acquired}
            onChange={v => set("date_acquired", v)}
            type="date"
          />

          {/* Valuation */}
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Purchase Cost (₱)"
              value={form.purchase_cost}
              onChange={v => set("purchase_cost", v)}
              placeholder="0.00"
              type="number"
            />
            <TextInput
              label="Current Value (₱)"
              value={form.current_value}
              onChange={v => set("current_value", v)}
              placeholder="0.00"
              type="number"
            />
          </div>
          <TextInput
            label="Purchase Date"
            value={form.purchase_date}
            onChange={v => set("purchase_date", v)}
            type="date"
          />

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Assigned To"
              value={form.assigned_to}
              onChange={v => set("assigned_to", v)}
              placeholder="e.g. Barangay Hall Office"
            />
            <TextInput
              label="Location"
              value={form.location}
              onChange={v => set("location", v)}
              placeholder="e.g. Storage Room B"
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={3}
              placeholder="Additional notes about this item…"
              className="w-full text-[13px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-blue-50 text-[#1F2937] dark:text-white placeholder:text-[#D1D5DB] dark:placeholder:text-[#525252] transition bg-white dark:bg-[#171717] resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <FieldLabel required>Status</FieldLabel>
            <div className="flex gap-3">
              <StatusOption
                value="SERVICEABLE"
                label="Serviceable"
                description="Ready for use"
                color="bg-green-500 dark:bg-green-500"
                selected={form.status === "SERVICEABLE"}
                onClick={() => set("status", "SERVICEABLE")}
              />
              <StatusOption
                value="UNSERVICEABLE"
                label="Unserviceable"
                description="Needs repair"
                color="bg-amber-500 dark:bg-amber-500"
                selected={form.status === "UNSERVICEABLE"}
                onClick={() => set("status", "UNSERVICEABLE")}
              />
              <StatusOption
                value="MISSING"
                label="Missing"
                description="Cannot be located"
                color="bg-red-500 dark:bg-red-500"
                selected={form.status === "MISSING"}
                onClick={() => set("status", "MISSING")}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200">
              <p className="text-[12px] text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Preview strip */}
          {form.name && (
            <div className="px-4 py-3 rounded-xl bg-[#F4F5F7] dark:bg-[#262626] border border-[#E9EAEC] dark:border-[#262626]">
              <p className="text-[10px] font-bold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide mb-1">Preview</p>
              <p className="text-[13px] font-bold text-[#1F2937] dark:text-white">{form.name}</p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] mt-0.5">
                Qty: {form.quantity} · {form.status} {form.condition ? `· ${form.condition}` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
          <button
            onClick={() => router.push("/equipment")}
            className="px-5 py-2.5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] text-[13px] font-bold text-[#6B7280] dark:text-[#A3A3A3] hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Equipment"}
          </button>
        </div>
      </div>
    </div>
  );
}