"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Heart, Save } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface HealthForm { record_type: string; notes: string }
interface HealthRecordData extends HealthForm { resident_name: string }

const RECORD_TYPES = [
  "Hypertension", "Diabetes", "Tuberculosis", "Prenatal Checkup",
  "Postnatal Checkup", "Well-child Checkup", "Asthma", "Family Planning",
  "Dental Checkup", "Eye Checkup", "Mental Health", "Malnutrition",
  "Malaria", "Dengue", "COVID-19", "Other",
];

const TYPE_COLORS: Record<string, string> = {
  "Hypertension":       "border-red-200    bg-red-50    text-red-700",
  "Diabetes":           "border-amber-200  bg-amber-50  text-amber-700",
  "Tuberculosis":       "border-orange-200 bg-orange-50 text-orange-700",
  "Prenatal Checkup":   "border-pink-200   bg-pink-50   text-pink-700",
  "Postnatal Checkup":  "border-pink-200   bg-pink-50   text-pink-700",
  "Well-child Checkup": "border-green-200  bg-green-50  text-green-700",
  "Asthma":             "border-blue-200   bg-blue-50   text-blue-700",
  "Family Planning":    "border-purple-200 bg-purple-50 text-purple-700",
};

// ─── MAIN PAGE (keyed by id so state resets cleanly on navigation) ───────────
export default function EditHealthRecordPage() {
  const { id } = useParams<{ id: string }>();
  return <EditHealthRecordContent key={id} id={id} />;
}

function EditHealthRecordContent({ id }: { id: string }) {
  const router = useRouter();

  const [record,  setRecord]  = useState<HealthRecordData | null>(null);
  const [form,    setForm]    = useState<HealthForm>({ record_type: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: keyof HealthForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/health/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: HealthRecordData) => {
        if (cancelled) return;
        setRecord(data);
        setForm({ record_type: data.record_type, notes: data.notes ?? "" });
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (notFound) router.push("/health");
  }, [notFound, router]);

  const handleSave = useCallback(async () => {
    if (!form.record_type) { setError("Please select a record type."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/health/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_type: form.record_type, notes: form.notes || null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.push(`/health/${id}`);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }, [id, form, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-[13px] text-[#9CA3AF]">
        Loading health record…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-[13px] text-[#9CA3AF]">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/health/${id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
          <ArrowLeft size={18} className="text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Edit Health Record</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            Resident: <span className="font-semibold text-[#6B7280]">{record.resident_name}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">

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
            <div className="grid grid-cols-4 gap-2">
              {RECORD_TYPES.map(type => {
                const selected = form.record_type === type;
                const base = TYPE_COLORS[type] ?? "border-gray-200 bg-gray-50 text-gray-700";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set("record_type", type)}
                    className={`px-3 py-2.5 rounded-xl border-2 text-[11px] font-bold uppercase tracking-wide text-center transition
                      ${selected ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-sm" : `${base} hover:border-opacity-60`}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
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
            <span className="text-[11px] text-[#9CA3AF] ml-1">(optional)</span>
          </div>
          <div className="p-5">
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Enter findings, medications, referrals, or any observations..."
              rows={5}
              className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-3 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition resize-none bg-white"
            />
            <p className="text-[10px] text-[#9CA3AF] mt-1.5 text-right">{form.notes.length} characters</p>
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
          <button onClick={() => router.push(`/health/${id}`)} className="flex-1 py-3 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.record_type}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}