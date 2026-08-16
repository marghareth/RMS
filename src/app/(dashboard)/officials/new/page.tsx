// FILE: src/app/(dashboard)/officials/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCheck, Phone } from "lucide-react";
import { POSITIONS, PUROK_ASSIGNMENTS } from "@/lib/mock/officials";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";

export default function NewOfficialPage() {
  const router = useRouter();

  const [resident, setResident] = useState<PickedResident | null>(null);
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


    try {
       const res = await fetch("/api/officials", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           resident_id: resident.id,
           position,
           contact_no: contactNo || undefined,
           purok_assignment: purokAssignment || undefined,
           term_start: termStart,
           term_end: termEnd || undefined,
           is_active: isActive,
         }),
       });
       if (!res.ok) {
         const data = await res.json();
         setError(data.message || data.error || "Failed to add official.");
         return;
       }
       router.push("/officials");
     } catch (e) {
       console.error(e);
       setError("Something went wrong while saving. Please try again.");
     } finally {
       setSubmitting(false);
     }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/officials")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Officials
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">Add Official</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
          A resident can only hold one official record at a time.
        </p>
      </div>

      <div className="space-y-5">
        {/* Resident */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15">
              <UserCheck size={14} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Resident</p>
          </div>
          <ResidentPicker value={resident} onChange={setResident} placeholder="Search resident by name..." />
        </div>

        {/* Official details */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7] dark:bg-[#262626]">
              <Phone size={14} className="text-[#374151] dark:text-[#D4D4D4]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Official Details</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Purok Assignment
                </label>
                <select
                  value={purokAssignment}
                  onChange={(e) => setPurokAssignment(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Contact No.
              </label>
              <input
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="09XX-XXX-XXXX"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Term Start
                </label>
                <input
                  type="date"
                  value={termStart}
                  onChange={(e) => setTermStart(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Term End <span className="font-normal normal-case text-[#9CA3AF] dark:text-[#A3A3A3]">(optional)</span>
                </label>
                <input
                  type="date"
                  value={termEnd}
                  onChange={(e) => setTermEnd(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151] dark:text-[#D4D4D4]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-[#3B82F6] dark:text-[#60A5FA] focus:ring-[#3B82F6] dark:focus:ring-[#60A5FA]"
              />
              Mark as active immediately
            </label>
          </div>
        </div>

        {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={() => router.push("/officials")}
            className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Add Official"}
          </button>
        </div>
      </div>
    </div>
  );
}