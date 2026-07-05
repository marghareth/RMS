"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, IdCard, Search, X, Info } from "lucide-react";
import {
  MOCK_RESIDENTS_WITHOUT_ID,
  MOCK_BARANGAY_IDS,
  IdResidentMock,
  residentFullName,
  calcAge,
} from "@/lib/mock/barangayId";

// Lightweight resident search over the mock "without ID" pool — stands in
// for a real ResidentPicker query filtered to residents with no existing
// BarangayId record.
function ResidentSearch({
  value,
  onChange,
}: {
  value: IdResidentMock | null;
  onChange: (r: IdResidentMock | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = MOCK_RESIDENTS_WITHOUT_ID.filter((r) =>
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
          placeholder="Search resident by name..."
          className="w-full rounded-xl border border-[#E9EAEC] bg-white py-3 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6]"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No matching residents found</p>
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

export default function NewBarangayIdPage() {
  const router = useRouter();

  const [resident, setResident] = useState<IdResidentMock | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Preview of the auto-generated ID number (real logic lives server-side
  // via generateIdNumber() in POST /api/barangay-id).
  const previewIdNumber = `BID-${new Date().getFullYear()}-XXXXXX`;

  async function handleSubmit() {
    setError("");
    if (!resident) {
      setError("Please select a resident.");
      return;
    }
    if (MOCK_BARANGAY_IDS.some((i) => i.resident_id === resident.id)) {
      setError("This resident already has a barangay ID on file.");
      return;
    }

    setSubmitting(true);

    // ── MOCK SUBMIT ─────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    alert(
      `[MOCK] Barangay ID issued for ${residentFullName(resident)}.\nA real save will redirect back to the barangay ID directory.`
    );
    router.push("/barangay_id");

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
    // try {
    //   const res = await fetch("/api/barangay-id", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ resident_id: resident.id }),
    //   });
    //   if (!res.ok) {
    //     const data = await res.json();
    //     setError(data.error || "Failed to issue barangay ID.");
    //     return;
    //   }
    //   router.push("/barangay_id");
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
        onClick={() => router.push("/barangay_id")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Barangay ID
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Issue New Barangay ID</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
          An ID number will be generated automatically (preview: {previewIdNumber}).
        </p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
            <IdCard size={14} className="text-[#1D4ED8]" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Resident</p>
        </div>

        <div className="space-y-4">
          <ResidentSearch value={resident} onChange={setResident} />

          {resident && (
            <div className="rounded-lg bg-[#F9FAFB] px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Auto-Filled from Resident Profile
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-[#374151]">
                <p>
                  <span className="text-[#9CA3AF]">Full Name:</span> {residentFullName(resident)}
                </p>
                <p>
                  <span className="text-[#9CA3AF]">Sex:</span> {resident.sex}
                </p>
                <p>
                  <span className="text-[#9CA3AF]">Civil Status:</span> {resident.civil_status}
                </p>
                <p>
                  <span className="text-[#9CA3AF]">Purok:</span> {resident.purok_name}
                </p>
                <p className="col-span-2">
                  <span className="text-[#9CA3AF]">Address:</span> {resident.address}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-[#EBF3FF] px-3 py-2.5">
            <Info size={14} className="mt-0.5 shrink-0 text-[#1D4ED8]" />
            <p className="text-[11px] leading-relaxed text-[#1D4ED8]">
              Each resident can only hold one barangay ID at a time. Issuing a new one does not currently support
              reissuing/replacing an existing ID from this form.
            </p>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/barangay_id")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? "Issuing..." : "Issue Barangay ID"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}