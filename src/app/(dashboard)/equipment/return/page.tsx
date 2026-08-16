"use client";

import { useState, useEffect, useCallback } from "react";
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
        ${selected ? "border-[#3B82F6] dark:border-[#60A5FA] bg-blue-50 dark:bg-blue-500/15" : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] hover:border-[#D1D5DB] dark:hover:border-[#404040]"}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <Icon size={13} className={selected ? "text-[#3B82F6] dark:text-[#60A5FA]" : color} />
        <span className={`text-[12px] font-bold uppercase tracking-wide ${selected ? "text-[#3B82F6] dark:text-[#60A5FA]" : "text-[#1F2937] dark:text-white"}`}>
          {label}
        </span>
      </div>
      <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] pl-5">{description}</p>
    </button>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function InfoRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#F4F5F7] dark:border-[#262626] last:border-0">
      <span className="text-[11px] font-semibold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide min-w-32.5 shrink-0">{label}</span>
      <span className={`text-[12px] font-medium ${accent ?? "text-[#1F2937] dark:text-white"}`}>{value}</span>
    </div>
  );
}

// ─── PAGE (reads the query param, keys the content by it) ────────────────────
export default function ReturnEquipmentPage() {
  const searchParams = useSearchParams();
  const borrowingId  = searchParams.get("borrowing_id") ?? "1";

  // Keying by borrowingId forces a fresh mount whenever it changes, so all
  // state below (loading, borrowing, form fields, etc.) starts clean via its
  // initial useState value instead of needing a synchronous reset in an
  // effect — which avoids react-hooks/set-state-in-effect entirely.
  return <ReturnEquipmentContent key={borrowingId} borrowingId={borrowingId} />;
}

function ReturnEquipmentContent({ borrowingId }: { borrowingId: string }) {
  const router = useRouter();

  const [borrowing, setBorrowing] = useState<Borrowing | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  const [returnCondition, setReturnCondition] = useState("");
  const [notes,           setNotes]           = useState("");
  const [saving,          setSaving]          = useState(false);
  const [done,            setDone]            = useState(false);
  const [error,           setError]           = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/equipment/borrowings?id=${borrowingId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Borrowing[]) => {
        if (cancelled) return;
        const found = data.find(b => String(b.id) === borrowingId);
        if (!found) setNotFound(true);
        else setBorrowing(found);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [borrowingId]);

  // Redirect away once we know for sure the record doesn't exist.
  useEffect(() => {
    if (notFound) router.push("/equipment");
  }, [notFound, router]);

  const handleReturn = useCallback(async () => {
    if (!borrowing) return;
    if (!returnCondition) { setError("Please select the return condition."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/equipment/borrowings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:               borrowing.id,
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
  }, [borrowing, returnCondition]);

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Loading / not-found guard ─────────────────────────────────────────────
  // Everything below this line can safely assume `borrowing` is non-null.
  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
        Loading borrow record…
      </div>
    );
  }

  if (!borrowing) {
    // Either not found (redirect is already in flight) or fetch failed.
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
        Redirecting…
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-[18px] font-black text-[#1F2937] dark:text-white uppercase tracking-wide mb-1">
          Return Recorded
        </h2>
        <p className="text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3] mb-6">
          <span className="font-semibold text-[#1F2937] dark:text-white">{borrowing.equipment.name}</span> has been successfully returned by{" "}
          <span className="font-semibold text-[#1F2937] dark:text-white">{borrowing.borrower_name}</span>.
        </p>
        <div className="px-5 py-4 rounded-xl bg-[#F4F5F7] dark:bg-[#262626] border border-[#E9EAEC] dark:border-[#262626] text-left space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Date Returned</span>
            <span className="text-[12px] font-bold text-[#1F2937] dark:text-white">{today}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Condition</span>
            <span className="text-[12px] font-bold text-[#1F2937] dark:text-white capitalize">{returnCondition}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/equipment")}
            className="flex-1 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] text-white text-[13px] font-bold transition"
          >
            Back to Inventory
          </button>
          <button
            onClick={() => router.push(`/equipment/${borrowing.equipment.id}`)}
            className="flex-1 py-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] text-[#6B7280] dark:text-[#A3A3A3] text-[13px] font-bold hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
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
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
        >
          <ArrowLeft size={18} className="text-[#6B7280] dark:text-[#A3A3A3]" />
        </button>
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] dark:text-white uppercase tracking-wide">Process Return</h1>
          <p className="text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3] mt-0.5">Record the return of a borrowed item</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Borrow summary card ── */}
        <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                <Package size={14} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-[#1F2937] dark:text-white">Borrow Record</p>
            </div>
            {borrowing.is_overdue && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 uppercase">
                <AlertTriangle size={10} /> Overdue
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <InfoRow
              label="Equipment"
              value={
                <span className="flex items-center gap-1.5">
                  <Package size={12} className="text-[#3B82F6] dark:text-[#60A5FA]" />
                  {borrowing.equipment.name}
                </span>
              }
            />
            <InfoRow
              label="Borrower"
              value={
                <span className="flex items-center gap-1.5">
                  <User size={12} className="text-[#6B7280] dark:text-[#A3A3A3]" />
                  {borrowing.borrower_name}
                </span>
              }
            />
            <InfoRow
              label="Date Borrowed"
              value={
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-[#6B7280] dark:text-[#A3A3A3]" />
                  {fmtDate(borrowing.date_borrowed)}
                </span>
              }
            />
            <InfoRow
              label="Expected Return"
              value={fmtDate(borrowing.expected_return)}
              accent={borrowing.is_overdue ? "text-red-600 dark:text-red-400" : "text-[#1F2937] dark:text-white"}
            />
            <InfoRow label="Return Date" value={today} accent="text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* ── Return condition card ── */}
        <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
            <div className="w-8 h-8 rounded-lg bg-green-500 dark:bg-green-500 flex items-center justify-center">
              <RotateCcw size={14} className="text-white" />
            </div>
            <p className="text-[13px] font-bold text-[#1F2937] dark:text-white">Return Condition</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] uppercase tracking-wide mb-2">
                Condition when returned <span className="text-red-500 dark:text-red-400">*</span>
              </p>
              <div className="flex gap-3">
                <ConditionOption
                  value="Good"
                  label="Good"
                  description="No damage, working fine"
                  icon={CheckCircle2}
                  color="text-green-500 dark:text-green-400"
                  selected={returnCondition === "Good"}
                  onClick={() => setReturnCondition("Good")}
                />
                <ConditionOption
                  value="Fair"
                  label="Fair"
                  description="Minor wear, still usable"
                  icon={AlertTriangle}
                  color="text-amber-500 dark:text-amber-400"
                  selected={returnCondition === "Fair"}
                  onClick={() => setReturnCondition("Fair")}
                />
                <ConditionOption
                  value="Damaged"
                  label="Damaged"
                  description="Needs repair or replacement"
                  icon={AlertTriangle}
                  color="text-red-500 dark:text-red-400"
                  selected={returnCondition === "Damaged"}
                  onClick={() => setReturnCondition("Damaged")}
                />
              </div>
            </div>

            {/* Condition change notice */}
            {borrowing.equipment.condition && returnCondition && returnCondition !== borrowing.equipment.condition && (
              <div className={`px-4 py-3 rounded-xl border ${
                returnCondition === "Damaged" ? "bg-red-50 dark:bg-red-500/15 border-red-200" : "bg-amber-50 dark:bg-amber-500/15 border-amber-200"
              }`}>
                <p className={`text-[12px] font-medium ${returnCondition === "Damaged" ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                  Note: Condition changed from <strong>{borrowing.equipment.condition}</strong> to <strong>{returnCondition}</strong>.
                  {returnCondition === "Damaged" && " Consider updating the equipment status to Unserviceable."}
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[10px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] uppercase tracking-wide block mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional remarks about the return..."
                rows={3}
                className="w-full text-[13px] border border-[#E9EAEC] dark:border-[#262626] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-blue-50 text-[#1F2937] dark:text-white placeholder:text-[#D1D5DB] dark:placeholder:text-[#525252] transition resize-none bg-white dark:bg-[#171717]"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200">
            <p className="text-[12px] text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={() => router.push("/equipment")}
            className="flex-1 py-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] text-[13px] font-bold text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleReturn}
            disabled={saving || !returnCondition}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50 text-white text-[13px] font-bold transition shadow-sm"
          >
            <CheckCircle2 size={14} />
            {saving ? "Processing…" : "Confirm Return"}
          </button>
        </div>
      </div>
    </div>
  );
}