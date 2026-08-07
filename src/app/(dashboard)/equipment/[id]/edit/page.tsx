// FILE: src/app/(dashboard)/equipment/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Package } from "lucide-react";

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

const EMPTY_FORM: EquipmentForm = {
  name: "", quantity: "1", condition: "", status: "SERVICEABLE", date_acquired: "",
  asset_type: "", serial_number: "", image_url: "", purchase_cost: "", current_value: "",
  purchase_date: "", assigned_to: "", location: "", description: "",
};

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
    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
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
        className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition bg-white"
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
          className="w-full appearance-none text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] pr-8 bg-white transition"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[10px]">▼</span>
      </div>
    </div>
  );
}

function StatusCard({
  label, description, dot, selected, onClick,
}: {
  value: EquipmentStatus; label: string; description: string;
  dot: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left px-4 py-3 rounded-xl border-2 transition
        ${selected ? "border-[#3B82F6] bg-blue-50" : "border-[#E9EAEC] bg-white hover:border-[#D1D5DB]"}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className={`text-[12px] font-bold uppercase tracking-wide ${selected ? "text-[#3B82F6]" : "text-[#1F2937]"}`}>
          {label}
        </span>
      </div>
      <p className="text-[10px] text-[#9CA3AF] pl-4">{description}</p>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [form,   setForm]   = useState<EquipmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof EquipmentForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch(`/api/equipment/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(eq => setForm({
        name:          eq.name,
        quantity:      String(eq.quantity),
        condition:     eq.condition ?? "",
        status:        eq.status,
        date_acquired: eq.date_acquired ? eq.date_acquired.split("T")[0] : "",
        asset_type:    eq.asset_type ?? "",
        serial_number: eq.serial_number ?? "",
        image_url:     eq.image_url ?? "",
        purchase_cost: eq.purchase_cost != null ? String(eq.purchase_cost) : "",
        current_value: eq.current_value != null ? String(eq.current_value) : "",
        purchase_date: eq.purchase_date ? eq.purchase_date.split("T")[0] : "",
        assigned_to:   eq.assigned_to ?? "",
        location:      eq.location ?? "",
        description:   eq.description ?? "",
      }))
      .catch(() => router.push("/equipment"));
  }, [params.id, router]);

  async function handleSave() {
    if (!form.name.trim() || !form.quantity) {
      setError("Name and quantity are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/equipment/${params.id}`, {
        method:  "PATCH",
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
      if (!res.ok) throw new Error("Failed to update");
      router.push(`/equipment/${params.id}`);
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
          onClick={() => router.push(`/equipment/${params.id}`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
        >
          <ArrowLeft size={18} className="text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Edit Equipment</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Update equipment details</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
          <div className="w-9 h-9 rounded-xl bg-[#F59E0B] flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#1F2937]">{form.name || "—"}</p>
            <p className="text-[11px] text-[#9CA3AF]">Equipment ID: #{String(params.id).padStart(5, "0")}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Name */}
          <TextInput
            label="Equipment Name"
            value={form.name}
            onChange={v => set("name", v)}
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
                className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] transition bg-white"
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
              className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition bg-white resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <FieldLabel required>Status</FieldLabel>
            <div className="flex gap-3">
              <StatusCard value="SERVICEABLE"   label="Serviceable"   description="Ready for use"      dot="bg-green-500" selected={form.status === "SERVICEABLE"}   onClick={() => set("status", "SERVICEABLE")}   />
              <StatusCard value="UNSERVICEABLE" label="Unserviceable" description="Needs repair"       dot="bg-amber-500" selected={form.status === "UNSERVICEABLE"} onClick={() => set("status", "UNSERVICEABLE")} />
              <StatusCard value="MISSING"       label="Missing"       description="Cannot be located"  dot="bg-red-500"   selected={form.status === "MISSING"}       onClick={() => set("status", "MISSING")}       />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-[12px] text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E9EAEC] bg-[#F9FAFB]">
          <button
            onClick={() => router.push(`/equipment/${params.id}`)}
            className="px-5 py-2.5 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}