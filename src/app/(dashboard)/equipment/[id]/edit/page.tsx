"use client";

import { useState } from "react";
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
}

// ─── MOCK DATA (pre-filled per id) ────────────────────────────────────────────
const MOCK_EQUIPMENT: Record<string, EquipmentForm> = {
  "1": { name: "Megaphone",       quantity: "3",  condition: "Good",        status: "SERVICEABLE",   date_acquired: "2022-01-15" },
  "2": { name: "Plastic Chairs",  quantity: "50", condition: "Fair",        status: "SERVICEABLE",   date_acquired: "2021-05-10" },
  "3": { name: "Folding Tables",  quantity: "10", condition: "Good",        status: "SERVICEABLE",   date_acquired: "2021-05-10" },
  "4": { name: "Generator",       quantity: "1",  condition: "Needs repair",status: "UNSERVICEABLE", date_acquired: "2019-08-22" },
  "5": { name: "Tarpaulin Stand", quantity: "4",  condition: "Good",        status: "SERVICEABLE",   date_acquired: "2023-03-01" },
  "6": { name: "Sound System",    quantity: "1",  condition: "Good",        status: "SERVICEABLE",   date_acquired: "2022-11-12" },
  "7": { name: "Basketball Ring", quantity: "2",  condition: "Damaged",     status: "MISSING",       date_acquired: "2020-06-15" },
  "8": { name: "First Aid Kit",   quantity: "5",  condition: "Complete",    status: "SERVICEABLE",   date_acquired: "2024-01-08" },
};

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

function StatusCard({
  value, label, description, dot, selected, onClick,
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

  // ── Load from mock (replace useEffect + fetch when API is connected) ──────
  const initial = MOCK_EQUIPMENT[params.id] ?? {
    name: "", quantity: "1", condition: "", status: "SERVICEABLE" as EquipmentStatus, date_acquired: "",
  };

  const [form,   setForm]   = useState<EquipmentForm>(initial);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof EquipmentForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  useEffect(() => {
    fetch(`/api/equipment/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(eq => setForm({
        name:          eq.name,
        quantity:      String(eq.quantity),
        condition:     eq.condition ?? "",
        status:        eq.status,
        date_acquired: eq.date_acquired ? eq.date_acquired.split("T")[0] : "",
      }))
      .catch(() => router.push("/equipment"));
  }, [params.id]);

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
  ─────────────────────────────────────────────────────────────────────────── */

  // ── Mock save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim() || !form.quantity) {
      setError("Name and quantity are required.");
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    router.push(`/equipment/${params.id}`);
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
            <p className="text-[13px] font-bold text-[#1F2937]">{initial.name}</p>
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
            <TextInput
              label="Condition"
              value={form.condition}
              onChange={v => set("condition", v)}
              placeholder="e.g. Good, Fair, Damaged"
            />
          </div>

          {/* Date Acquired */}
          <TextInput
            label="Date Acquired"
            value={form.date_acquired}
            onChange={v => set("date_acquired", v)}
            type="date"
          />

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