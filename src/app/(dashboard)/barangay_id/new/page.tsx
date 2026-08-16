// FILE: src/app/(dashboard)/barangay_id/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, IdCard, Info } from "lucide-react";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";

function fullName(r: PickedResident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mi}`;
}

export default function NewBarangayIdPage() {
  const router = useRouter();

  const [resident, setResident] = useState<PickedResident | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Preview of the auto-generated ID number (the real number is assigned
  // server-side by generateIdNumber() in POST /api/barangay-id).
  const previewIdNumber = `BID-${new Date().getFullYear()}-XXXXXX`;

  async function handleSubmit() {
    setError("");
    if (!resident) {
      setError("Please select a resident.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/barangay-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resident_id: resident.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Server returns e.g. DUPLICATE_ID with a human-readable message
        setError(data.message || data.error || "Failed to issue barangay ID.");
        return;
      }
      router.push("/barangay_id");
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
        onClick={() => router.push("/barangay_id")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Barangay ID
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">Issue New Barangay ID</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
          An ID number will be generated automatically (preview: {previewIdNumber}).
        </p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15">
            <IdCard size={14} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Resident</p>
        </div>

        <div className="space-y-4">
          <ResidentPicker value={resident} onChange={setResident} placeholder="Search resident by name..." />

          {resident && (
            <div className="rounded-lg bg-[#F9FAFB] dark:bg-[#171717] px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">
                Auto-Filled from Resident Profile
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-[#374151] dark:text-[#D4D4D4]">
                <p>
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">Full Name:</span> {fullName(resident)}
                </p>
                <p>
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">Sex:</span> {resident.sex}
                </p>
                <p>
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">Civil Status:</span> {resident.civil_status ?? "—"}
                </p>
                <p>
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">Purok:</span> {resident.purok?.name ?? "—"}
                </p>
                <p className="col-span-2">
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">Address:</span> {resident.household?.address ?? "—"}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15 px-3 py-2.5">
            <Info size={14} className="mt-0.5 shrink-0 text-[#1D4ED8] dark:text-[#93C5FD]" />
            <p className="text-[11px] leading-relaxed text-[#1D4ED8] dark:text-[#93C5FD]">
              Each resident can only hold one barangay ID at a time. Issuing a new one does not currently support
              reissuing/replacing an existing ID from this form.
            </p>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/barangay_id")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
            >
              {submitting ? "Issuing..." : "Issue Barangay ID"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}