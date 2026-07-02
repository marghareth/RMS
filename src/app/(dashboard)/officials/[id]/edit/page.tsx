"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserCheck, Phone } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  MOCK_OFFICIALS,
  POSITIONS,
  PUROK_ASSIGNMENTS,
  BrgyOfficialMock,
  residentFullName,
} from "@/lib/mock/officials";

export default function EditOfficialPage() {
  const router = useRouter();
  const params = useParams();
  const officialId = Number(params.id);

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // In place of the real GET /api/officials/[id] call. Swap for the
  // commented block below once the database is connected.
  const [original] = useState<BrgyOfficialMock | null>(
    () => MOCK_OFFICIALS.find((o) => o.id === officialId) ?? null
  );
  const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [original, setOriginal] = useState<BrgyOfficialMock | null>(null);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadOfficial() {
  //     setLoading(true);
  //     try {
  //       const res = await fetch(`/api/officials/${officialId}`);
  //       if (!res.ok) throw new Error("Not found");
  //       const data = await res.json();
  //       setOriginal(data);
  //       setPosition(data.position);
  //       setPurokAssignment(data.purok_assignment ?? "");
  //       setContactNo(data.contact_no ?? "");
  //       setTermStart(data.term_start.slice(0, 10));
  //       setTermEnd(data.term_end ? data.term_end.slice(0, 10) : "");
  //       setIsActive(data.is_active);
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadOfficial();
  // }, [officialId]);

  const [position, setPosition] = useState(original?.position ?? "");
  const [purokAssignment, setPurokAssignment] = useState(original?.purok_assignment ?? "");
  const [contactNo, setContactNo] = useState(original?.contact_no ?? "");
  const [termStart, setTermStart] = useState(original?.term_start.slice(0, 10) ?? "");
  const [termEnd, setTermEnd] = useState(original?.term_end?.slice(0, 10) ?? "");
  const [isActive, setIsActive] = useState(original?.is_active ?? true);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  if (!original) {
    return (
      <EmptyState
        icon={UserCheck}
        title="Official not found"
        description="This official record doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/officials")}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Back to Officials
          </button>
        }
      />
    );
  }

  async function handleSubmit() {
    setError("");
    if (!position) {
      setError("Please select a position.");
      return;
    }
    if (!termStart) {
      setError("Please provide a term start date.");
      return;
    }

    setSubmitting(true);

    // ── MOCK SUBMIT ─────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    alert(`[MOCK] ${residentFullName(original!.resident)}'s record updated.\nA real save will redirect back to the officials directory.`);
    router.push("/officials");

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
    // try {
    //   const res = await fetch(`/api/officials/${officialId}`, {
    //     method: "PATCH",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       position,
    //       purok_assignment: purokAssignment || null,
    //       term_start: termStart,
    //       term_end: termEnd || null,
    //       is_active: isActive,
    //     }),
    //   });
    //   if (!res.ok) throw new Error("Failed to update official");
    //   router.push("/officials");
    // } catch (e) {
    //   console.error(e);
    //   setError("Something went wrong while saving. Please try again.");
    // } finally {
    //   setSubmitting(false);
    // }

    // Note: contact_no is on the BrgyOfficial model too, but the API's
    // PATCH handler above doesn't currently accept it — only position,
    // purok_assignment, term_start, term_end, and is_active are updatable.
    // Flag this to the backend if contact editing needs to be supported.
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/officials")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Officials
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Edit Official</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">{residentFullName(original.resident)}</p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        {/* Resident (read-only) */}
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] text-[13px] font-black text-[#1D4ED8]">
            {original.resident.fname[0]}
            {original.resident.lname[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#1F2937]">{residentFullName(original.resident)}</p>
            <p className="text-[11px] text-[#9CA3AF]">
              Linked resident cannot be changed — remove and re-add to reassign.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7]">
            <Phone size={14} className="text-[#374151]" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Official Details</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              >
                <option value="">Select position</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Purok Assignment
              </label>
              <select
                value={purokAssignment}
                onChange={(e) => setPurokAssignment(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              >
                <option value="">None</option>
                {PUROK_ASSIGNMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Contact No.
            </label>
            <input
              value={contactNo}
              onChange={(e) => setContactNo(e.target.value)}
              placeholder="09XX-XXX-XXXX"
              className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Term Start
              </label>
              <input
                type="date"
                value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Term End <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span>
              </label>
              <input
                type="date"
                value={termEnd}
                onChange={(e) => setTermEnd(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
            />
            Active
          </label>

          {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/officials")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}