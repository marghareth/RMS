// FILE PATH: src/app/(dashboard)/blotter/new/page.tsx
// Replace the entire contents of this file with the code below.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, UserX, FileText, Info } from "lucide-react";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";
import { addWorkingDays } from "@/lib/mock/blotter";

export default function NewBlotterCasePage() {
  const router = useRouter();

  // ── Complainant ───────────────────────────────────────────────────────────
  const [complainant, setComplainant] = useState<PickedResident | null>(null);
  const [complainantName, setComplainantName] = useState("");
  const [complainantContact, setComplainantContact] = useState("");
  const [complainantAddress, setComplainantAddress] = useState("");
  const [complainantWalkIn, setComplainantWalkIn] = useState(false);

  // ── Respondent ────────────────────────────────────────────────────────────
  const [respondent, setRespondent] = useState<PickedResident | null>(null);
  const [respondentName, setRespondentName] = useState("");
  const [respondentWalkIn, setRespondentWalkIn] = useState(false);

  // ── Case details ──────────────────────────────────────────────────────────
  const [narrative, setNarrative] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [hearingDate, setHearingDate] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only derive a suggestion when incidentDate is actually set — avoids
  // calling the impure Date.now() during render if the field is cleared.
  const suggestedHearing = incidentDate
    ? addWorkingDays(new Date(incidentDate), 3).toISOString().slice(0, 10)
    : null;

  async function handleSubmit() {
    setError("");

    const finalComplainantName = complainantWalkIn ? complainantName.trim() : complainant
      ? `${complainant.lname}, ${complainant.fname}`
      : "";
    const finalRespondentName = respondentWalkIn ? respondentName.trim() : respondent
      ? `${respondent.lname}, ${respondent.fname}`
      : "";

    if (!finalComplainantName) {
      setError("Please select or enter the complainant's name.");
      return;
    }
    if (!finalRespondentName) {
      setError("Please select or enter the respondent's name.");
      return;
    }
    if (!narrative.trim()) {
      setError("Please provide the incident narrative.");
      return;
    }
    if (!incidentDate) {
      setError("Please provide the incident date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/blotter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complainant_id: complainantWalkIn ? null : complainant?.id,
          complainant_name: finalComplainantName,
          complainant_contact: complainantContact || undefined,
          complainant_address: complainantAddress || undefined,
          respondent_id: respondentWalkIn ? null : respondent?.id,
          respondent_name: finalRespondentName,
          incident_narrative: narrative,
          incident_date: incidentDate,
          hearing_date: hearingDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to file case");
      const created = await res.json();
      router.push(`/blotter/${created.id}`);
    } catch (e) {
      console.error(e);
      setError("Something went wrong while filing the case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => router.push("/blotter")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Blotter
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">File New Blotter Case</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
          A unique case number will be generated automatically upon filing.
        </p>
      </div>

      <div className="space-y-5">
        {/* Complainant */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
                <User size={14} className="text-[#1D4ED8]" />
              </div>
              <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Complainant</p>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280]">
              <input
                type="checkbox"
                checked={complainantWalkIn}
                onChange={(e) => {
                  setComplainantWalkIn(e.target.checked);
                  setComplainant(null);
                }}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Walk-in (not yet in RBI)
            </label>
          </div>

          {complainantWalkIn ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Full Name
                </label>
                <input
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Contact No.
                </label>
                <input
                  value={complainantContact}
                  onChange={(e) => setComplainantContact(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Address
                </label>
                <input
                  value={complainantAddress}
                  onChange={(e) => setComplainantAddress(e.target.value)}
                  placeholder="Purok, Street"
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>
          ) : (
            <ResidentPicker value={complainant} onChange={setComplainant} placeholder="Search complainant by name..." />
          )}
        </div>

        {/* Respondent */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEE2E2]">
                <UserX size={14} className="text-[#DC2626]" />
              </div>
              <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Respondent</p>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280]">
              <input
                type="checkbox"
                checked={respondentWalkIn}
                onChange={(e) => {
                  setRespondentWalkIn(e.target.checked);
                  setRespondent(null);
                }}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Not in RBI / unidentified
            </label>
          </div>

          {respondentWalkIn ? (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Full Name / Description
              </label>
              <input
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Pedro Santos, or 'Unidentified individual'"
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          ) : (
            <ResidentPicker value={respondent} onChange={setRespondent} placeholder="Search respondent by name..." />
          )}
        </div>

        {/* Incident details */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7]">
              <FileText size={14} className="text-[#374151]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Incident Details</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Incident Narrative
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={5}
                placeholder="Describe the complaint in detail..."
                className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Incident Date
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Hearing Date <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span>
                </label>
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {suggestedHearing && (
              <div className="flex items-start gap-2 rounded-lg bg-[#EBF3FF] px-3 py-2.5">
                <Info size={14} className="mt-0.5 shrink-0 text-[#1D4ED8]" />
                <p className="text-[11px] leading-relaxed text-[#1D4ED8]">
                  Barangay rule: hearings should be scheduled within 3 working days of filing.
                  Based on the incident date, that would be around{" "}
                  <span className="font-semibold">
                    {new Date(suggestedHearing).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  .
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={() => router.push("/blotter")}
            className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
          >
            {submitting ? "Filing Case..." : "File Case"}
          </button>
        </div>
      </div>
    </div>
  );
}