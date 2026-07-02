"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCheck, Search, X, Phone } from "lucide-react";
import {
  MOCK_ELIGIBLE_RESIDENTS,
  POSITIONS,
  PUROK_ASSIGNMENTS,
  OfficialResidentMock,
  residentFullName,
  calcAge,
} from "@/lib/mock/officials";

// Lightweight resident search over the mock "eligible" pool (residents not
// already holding an official position — resident_id is @unique on
// BrgyOfficial). Stands in for a real ResidentPicker query filtered server-side.
function ResidentSearch({
  value,
  onChange,
}: {
  value: OfficialResidentMock | null;
  onChange: (r: OfficialResidentMock | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = MOCK_ELIGIBLE_RESIDENTS.filter((r) =>
    residentFullName(r).toLowerCase().includes(query.toLowerCase())
  );

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1F2937]">{residentFullName(value)}</p>
          <p className="truncate text-[11px] text-[#9CA3AF]">
            {value.sex} &middot; {calcAge(value.birthdate)} yrs old &middot; {value.address}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition hover:bg-[#E9EAEC] hover:text-[#374151]"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search resident (not currently an official)..."
          className="w-full rounded-xl border border-[#E9EAEC] bg-white py-3 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6]"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No eligible residents found</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange(r);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 border-b border-[#F4F5F7] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB]"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937]">{residentFullName(r)}</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    {r.sex} &middot; {calcAge(r.birthdate)} yrs old &middot; {r.address}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NewOfficialPage() {
  const router = useRouter();

  const [resident, setResident] = useState<OfficialResidentMock | null>(null);
  const [position, setPosition] = useState("");
  const [purokAssignment, setPurokAssignment] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [termStart, setTermStart] = useState(new Date().toISOString().slice(0, 10));
  const [termEnd, setTermEnd] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!resident) {
      setError("Please select a resident to appoint.");
      return;
    }
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
    alert(
      `[MOCK] ${residentFullName(resident)} added as ${position}.\nA real save will redirect back to the officials directory.`
    );
    router.push("/officials");

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
    // try {
    //   const res = await fetch("/api/officials", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       resident_id: resident.id,
    //       position,
    //       contact_no: contactNo || undefined,
    //       purok_assignment: purokAssignment || undefined,
    //       term_start: termStart,
    //       term_end: termEnd || undefined,
    //       is_active: isActive,
    //     }),
    //   });
    //   if (!res.ok) {
    //     const data = await res.json();
    //     // resident_id is @unique — API returns 409/400 if already an official
    //     setError(data.error || "Failed to add official.");
    //     return;
    //   }
    //   router.push("/officials");
    // } catch (e) {
    //   console.error(e);
    //   setError("Something went wrong while saving. Please try again.");
    // } finally {
    //   setSubmitting(false);
    // }
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
        <h1 className="text-xl font-bold text-[#1F2937]">Add Official</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
          A resident can only hold one official record at a time.
        </p>
      </div>

      <div className="space-y-5">
        {/* Resident */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
              <UserCheck size={14} className="text-[#1D4ED8]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Resident</p>
          </div>
          <ResidentSearch value={resident} onChange={setResident} />
        </div>

        {/* Official details */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
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
              Mark as active immediately
            </label>
          </div>
        </div>

        {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

        <div className="flex items-center justify-end gap-3 pb-8">
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
            {submitting ? "Saving..." : "Add Official"}
          </button>
        </div>
      </div>
    </div>
  );
}