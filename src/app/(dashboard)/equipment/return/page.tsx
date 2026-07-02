"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Package, CheckCircle2, AlertTriangle,
  RotateCcw, CalendarDays, User,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Borrowing {
  id:              number;
  borrower_name:   string;
  date_borrowed:   string;
  expected_return: string;
  is_overdue:      boolean;
  equipment: {
    id:        number;
    name:      string;
    condition: string | null;
  };
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_BORROWINGS: Record<string, Borrowing> = {
  "1": {
    id: 1, borrower_name: "Juan dela Cruz",
    date_borrowed: "2026-06-20", expected_return: "2026-06-27", is_overdue: true,
    equipment: { id: 1, name: "Megaphone", condition: "Good" },
  },
  "2": {
    id: 2, borrower_name: "Maria Santos",
    date_borrowed: "2026-06-28", expected_return: "2026-07-05", is_overdue: false,
    equipment: { id: 2, name: "Plastic Chairs", condition: "Fair" },
  },
  "3": {
    id: 3, borrower_name: "Pedro Reyes",
    date_borrowed: "2026-06-29", expected_return: "2026-07-01", is_overdue: false,
    equipment: { id: 6, name: "Sound System", condition: "Good" },
  },
};

// ─── CONDITION OPTION ─────────────────────────────────────────────────────────
function ConditionOption({
  value, label, description, icon: Icon, color, selected, onClick,
}: {
  value: string; label: string; description: string;
  icon: any; color: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left px-4 py-3 rounded-xl border-2 transition
        ${selected ? "border-[#3B82F6] bg-blue-50" : "border-[#E9EAEC] bg-white hover:border-[#D1D5DB]"}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <Icon size={13} className={selected ? "text-[#3B82F6]" : color} />
        <span className={`text-[12px] font-bold uppercase tracking-wide ${selected ? "text-[#3B82F6]" : "text-[#1F2937]"}`}>
          {label}
        </span>
      </div>
      <p className="text-[10px] text-[#9CA3AF] pl-5">{description}</p>
    </button>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function InfoRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#F4F5F7] last:border-0">
      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-32.5 shrink-0">{label}</span>
      <span className={`text-[12px] font-medium ${accent ?? "text-[#1F2937]"}`}>{value}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ReturnEquipmentPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const borrowingId  = searchParams.get("borrowing_id") ?? "1";

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [borrowing, setBorrowing] = useState<Borrowing | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/equipment/borrowings?id=${borrowingId}`)  // or filter from list
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const found = data.find((b: Borrowing) => String(b.id) === borrowingId);
        if (!found) router.push("/equipment");
        else setBorrowing(found);
      })
      .catch(() => router.push("/equipment"))
      .finally(() => setLoading(false));
  }, [borrowingId]);

  async function handleReturn() {
    if (!returnCondition) { setError("Please select the return condition."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/equipment/borrowings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:               parseInt(borrowingId),
          return_condition: returnCondition,
        }),
      });
      if (!res.ok) throw new Error("Failed to process return");
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
  ─────────────────────────────────────────────────────────────────────────── */

  // ── Mock data ─────────────────────────────────────────────────────────────
  const borrowing = MOCK_BORROWINGS[borrowingId] ?? MOCK_BORROWINGS["1"];

  const [returnCondition, setReturnCondition] = useState("");
  const [notes,           setNotes]           = useState("");
  const [saving,          setSaving]          = useState(false);
  const [done,            setDone]            = useState(false);
  const [error,           setError]           = useState("");

  // ── Mock return handler ───────────────────────────────────────────────────
  async function handleReturn() {
    if (!returnCondition) { setError("Please select the return condition."); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setDone(true);
  }

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide mb-1">
          Return Recorded
        </h2>
        <p className="text-[13px] text-[#9CA3AF] mb-6">
          <span className="font-semibold text-[#1F2937]">{borrowing.equipment.name}</span> has been successfully returned by{" "}
          <span className="font-semibold text-[#1F2937]">{borrowing.borrower_name}</span>.
        </p>
        <div className="px-5 py-4 rounded-xl bg-[#F4F5F7] border border-[#E9EAEC] text-left space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-[11px] text-[#9CA3AF]">Date Returned</span>
            <span className="text-[12px] font-bold text-[#1F2937]">{today}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-[#9CA3AF]">Condition</span>
            <span className="text-[12px] font-bold text-[#1F2937] capitalize">{returnCondition}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/equipment")}
            className="flex-1 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-bold transition"
          >
            Back to Inventory
          </button>
          <button
            onClick={() => router.push(`/equipment/${borrowing.equipment.id}`)}
            className="flex-1 py-3 rounded-xl border border-[#E9EAEC] text-[#6B7280] text-[13px] font-bold hover:bg-[#F4F5F7] transition"
          >
            View Equipment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/equipment")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
        >
          <ArrowLeft size={18} className="text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Process Return</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Record the return of a borrowed item</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Borrow summary card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                <Package size={14} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-[#1F2937]">Borrow Record</p>
            </div>
            {borrowing.is_overdue && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 uppercase">
                <AlertTriangle size={10} /> Overdue
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <InfoRow
              label="Equipment"
              value={
                <span className="flex items-center gap-1.5">
                  <Package size={12} className="text-[#3B82F6]" />
                  {borrowing.equipment.name}
                </span>
              }
            />
            <InfoRow
              label="Borrower"
              value={
                <span className="flex items-center gap-1.5">
                  <User size={12} className="text-[#6B7280]" />
                  {borrowing.borrower_name}
                </span>
              }
            />
            <InfoRow
              label="Date Borrowed"
              value={
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-[#6B7280]" />
                  {fmtDate(borrowing.date_borrowed)}
                </span>
              }
            />
            <InfoRow
              label="Expected Return"
              value={fmtDate(borrowing.expected_return)}
              accent={borrowing.is_overdue ? "text-red-600" : "text-[#1F2937]"}
            />
            <InfoRow label="Return Date" value={today} accent="text-green-600" />
          </div>
        </div>

        {/* ── Return condition card ── */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <RotateCcw size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937]">Return Condition</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                Condition when returned <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-3">
                <ConditionOption
                  value="Good"
                  label="Good"
                  description="No damage, working fine"
                  icon={CheckCircle2}
                  color="text-green-500"
                  selected={returnCondition === "Good"}
                  onClick={() => setReturnCondition("Good")}
                />
                <ConditionOption
                  value="Fair"
                  label="Fair"
                  description="Minor wear, still usable"
                  icon={AlertTriangle}
                  color="text-amber-500"
                  selected={returnCondition === "Fair"}
                  onClick={() => setReturnCondition("Fair")}
                />
                <ConditionOption
                  value="Damaged"
                  label="Damaged"
                  description="Needs repair or replacement"
                  icon={AlertTriangle}
                  color="text-red-500"
                  selected={returnCondition === "Damaged"}
                  onClick={() => setReturnCondition("Damaged")}
                />
              </div>
            </div>

            {/* Condition change notice */}
            {borrowing.equipment.condition && returnCondition && returnCondition !== borrowing.equipment.condition && (
              <div className={`px-4 py-3 rounded-xl border ${
                returnCondition === "Damaged" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
              }`}>
                <p className={`text-[12px] font-medium ${returnCondition === "Damaged" ? "text-red-600" : "text-amber-700"}`}>
                  Note: Condition changed from <strong>{borrowing.equipment.condition}</strong> to <strong>{returnCondition}</strong>.
                  {returnCondition === "Damaged" && " Consider updating the equipment status to Unserviceable."}
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional remarks about the return..."
                rows={3}
                className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition resize-none bg-white"
              />
            </div>
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
            className="flex-1 py-3 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleReturn}
            disabled={saving || !returnCondition}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <CheckCircle2 size={14} />
            {saving ? "Processing…" : "Confirm Return"}
          </button>
        </div>
      </div>
    </div>
  );
}