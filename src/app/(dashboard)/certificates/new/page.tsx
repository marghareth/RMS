// FILE: src/app/(dashboard)/certificates/new/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, User, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";
import {
  MOCK_CERTIFICATES,
  MOCK_ACTIVE_CAPTAIN,
  CERTIFICATE_TYPES,
  CertificateType,
  isEligibleByResidency,
  findRecentDuplicate,
  formatISODate,
  certDisplayDate,
} from "@/lib/mock/certificates";

export default function NewCertificatePage() {
  const router = useRouter();

  const [walkIn, setWalkIn] = useState(false);
  const [resident, setResident] = useState<PickedResident | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const [certType, setCertType] = useState<CertificateType | "">("");
  const [purpose, setPurpose] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── ELIGIBILITY CHECKS ──────────────────────────────────────────────────
  // Mirrors what POST /api/certificates validates server-side: a 6-month
  // residency requirement and a 30-day duplicate-issuance guard. This is a
  // client-side preview only, computed off the same fields the server
  // checks (residency_start_date, falling back to created_at for legacy
  // rows) — the server call below is still the authoritative check and
  // will reject regardless of what this shows.
  const residencyEligible = useMemo(() => {
    if (walkIn || !resident) return null;
    const reference = resident.residency_start_date ?? resident.created_at;
    if (!reference) return null; // shouldn't happen, but don't claim either way
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(reference) <= sixMonthsAgo;
  }, [walkIn, resident]);

  const duplicateWarning = useMemo(() => {
    if (walkIn || !resident || !certType) return null;
    return findRecentDuplicate(MOCK_CERTIFICATES, resident.id, certType);
  }, [walkIn, resident, certType]);

  async function handleSubmit() {
    setError("");

    if (!walkIn && !resident) {
      setError("Please select a resident, or switch to walk-in entry.");
      return;
    }
    if (walkIn && !manualName.trim()) {
      setError("Please enter the walk-in applicant's name.");
      return;
    }
    if (!certType) {
      setError("Please select a certificate type.");
      return;
    }
    if (!purpose.trim()) {
      setError("Please provide the purpose for this certificate.");
      return;
    }
    if (duplicateWarning) {
      setError(
        `A ${certType} certificate was already issued to this resident within the last 30 days (${formatISODate(
          certDisplayDate(duplicateWarning)
        )}). Please confirm before proceeding.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: walkIn ? null : resident?.id,
          certificate_type: certType,
          purpose,
          flagged_manual: walkIn,
          manual_name: walkIn ? manualName : undefined,
          manual_address: walkIn ? manualAddress : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Server returns RESIDENCY_CHECK_FAILED (400) or DUPLICATE_CERT (409)
        // with a human-readable `message` field — surface it directly.
        setError(data.message || "Something went wrong while issuing the certificate.");
        return;
      }
      router.push(`/certificates/${data.id}/preview`);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/certificates")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Certificates
      </button>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white">Request Certificate</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
          Auto-fills from the residents profile. A certificate number will be generated automatically.
        </p>
      </div>

      <div className="space-y-5">
        {/* Applicant */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15">
                <User size={14} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
              </div>
              <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Applicant</p>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
              <input
                type="checkbox"
                checked={walkIn}
                onChange={(e) => {
                  setWalkIn(e.target.checked);
                  setResident(null);
                }}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-[#3B82F6] dark:text-[#60A5FA] focus:ring-[#3B82F6] dark:focus:ring-[#60A5FA]"
              />
              Walk-in (not yet in RBI)
            </label>
          </div>

          {walkIn ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Full Name
                </label>
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Address
                </label>
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Purok, Street"
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-[#FEF3C7] dark:bg-amber-500/15 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#D97706] dark:text-[#FBBF24]" />
                <p className="text-[11px] leading-relaxed text-[#92400E] dark:text-[#FBBF24]">
                  This certificate will be flagged as manually issued (walk-in). Consider registering this person in
                  the RBI for future issuances.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <ResidentPicker value={resident} onChange={setResident} placeholder="Search resident by name..." />
              {resident && residencyEligible === true && (
                <div className="flex items-center gap-2 rounded-lg bg-[#D1FAE5] dark:bg-emerald-500/15 px-3 py-2">
                  <CheckCircle2 size={14} className="shrink-0 text-[#059669] dark:text-[#34D399]" />
                  <p className="text-[11px] text-[#059669] dark:text-[#34D399]">
                    Meets the 6-month residency requirement for certificate issuance.
                  </p>
                </div>
              )}
              {resident && residencyEligible === false && (
                <div className="flex items-start gap-2 rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-3 py-2.5">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#DC2626] dark:text-[#F87171]" />
                  <p className="text-[11px] leading-relaxed text-[#DC2626] dark:text-[#F87171]">
                    This resident has not been in the barangay for at least 6 months yet, so this request will be
                    rejected on submit. Consider a walk-in / manual entry instead, or wait until they&apos;re eligible.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Certificate details */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7] dark:bg-[#262626]">
              <FileText size={14} className="text-[#374151] dark:text-[#D4D4D4]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Certificate Details</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Certificate Type
              </label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value as CertificateType)}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              >
                <option value="">Select certificate type</option>
                {CERTIFICATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Purpose
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                placeholder="e.g. Requirement for school enrollment"
                className="w-full resize-none rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>

            {duplicateWarning && (
              <div className="flex items-start gap-2 rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#DC2626] dark:text-[#F87171]" />
                <p className="text-[11px] leading-relaxed text-[#DC2626] dark:text-[#F87171]">
                  Same certificate type was already issued to this resident on{" "}
                  <span className="font-semibold">{formatISODate(certDisplayDate(duplicateWarning))}</span> (within the last
                  30 days). Filing will require override confirmation.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15 px-3 py-2.5">
              <Info size={14} className="mt-0.5 shrink-0 text-[#1D4ED8] dark:text-[#93C5FD]" />
              <p className="text-[11px] leading-relaxed text-[#1D4ED8] dark:text-[#93C5FD]">
                This certificate will be signed by{" "}
                <span className="font-semibold">{MOCK_ACTIVE_CAPTAIN.name}</span>, the active{" "}
                {MOCK_ACTIVE_CAPTAIN.position} ({MOCK_ACTIVE_CAPTAIN.term}), auto-attached as signatory.
              </p>
            </div>
          </div>
        </div>

        {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={() => router.push("/certificates")}
            className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Request"}
          </button>
        </div>
      </div>
    </div>
  );
}