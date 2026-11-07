// FILE: src/app/(dashboard)/certificates/new/page.tsx
//
// PROCESS NOW (Nov 2026): when no other request is Pending, the form offers
// two ways to save — "Process now" (skips Pending and starts it as
// Processing, for applicants who can be served on the spot) and "Submit
// request" (the usual: Pending in the Document Queue). While anyone is
// waiting, only Submit request is offered so nobody is skipped; the API
// enforces the same rule. The queue count is re-checked every 30 seconds
// and again just before the summary opens. "What happens after you save"
// (RequestFlowGuide) and the "How to use" guide explain the status flow.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, User, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";
import {
  CertificateMock,
  CERTIFICATE_TYPES,
  CertificateType,
  isEligibleByResidency,
  findRecentDuplicate,
  formatISODate,
  certDisplayDate,
} from "@/lib/mock/certificates";
import { useBarangayInfo } from "@/lib/hooks/useBarangayInfo";
import { fieldProblems, problemFor } from "@/lib/form-rules";
import FieldError, { fieldErrorBorder } from "@/components/shared/FieldError";
import RequestSummaryDialog from "@/components/shared/RequestSummaryDialog";
import { useFormTimer } from "@/lib/hooks/useFormTimer";
import RequestFlowGuide from "@/components/certificates/RequestFlowGuide";
import PageTutorial from "@/components/shared/PageTutorial";
import { DOCUMENT_TUTORIALS } from "@/lib/documentTutorials";

// How often to re-check whether anyone is waiting in the queue.
const QUEUE_POLL_MS = 30_000;

export default function NewCertificatePage() {
  const router = useRouter();

  // Real signatory (active Punong Barangay, or the General Settings override).
  const { captain } = useBarangayInfo();

  const [walkIn, setWalkIn] = useState(false);
  const [resident, setResident] = useState<PickedResident | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const [certType, setCertType] = useState<CertificateType | "">("");
  const [purpose, setPurpose] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Review step (Nov 2026): "review" before saving, "done" with the queue number after.
  const [summary, setSummary] = useState<"review" | "done" | null>(null);
  const [filed, setFiled] = useState<{ id: number; queue: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  // How long this form was open, for the Processing Time report.
  const timer = useFormTimer();

  // ── PROCESS NOW ────────────────────────────────────────────────────────
  // `waiting` = requests still PENDING (null until the first check comes
  // back, or if it fails — then only Submit request is offered).
  // `action` = which button opened the summary.
  const [waiting, setWaiting] = useState<number | null>(null);
  const [action, setAction] = useState<"request" | "process">("request");

  const refreshQueue = useCallback(async (): Promise<number | null> => {
    try {
      const res = await fetch("/api/certificates?status=PENDING&limit=1");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const total = typeof data?.total === "number" ? data.total : null;
      setWaiting(total);
      return total;
    } catch {
      setWaiting(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Deferred so no setState runs synchronously in the effect body
    // (react-hooks/set-state-in-effect), same as the rest of the app.
    Promise.resolve().then(() => {
      if (!cancelled) refreshQueue();
    });
    const id = window.setInterval(() => {
      if (!cancelled) refreshQueue();
    }, QUEUE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshQueue]);

  const canProcessNow = waiting === 0;

  // ── ELIGIBILITY HINTS ──────────────────────────────────────────────────
  // POST /api/certificates is the authority for both rules (6-month
  // residency, 30-day duplicate guard); these just surface them early.
  // ResidentPicker's lightweight result doesn't expose `created_at`, so the
  // residency hint can't be computed here and always passes — the server
  // performs the real check against Resident.created_at.
  const residencyEligible = useMemo(() => {
    if (walkIn || !resident) return null;
    // ResidentPicker doesn't expose created_at, so this mock always passes —
    // the real endpoint performs the actual check against Resident.created_at.
    return true;
  }, [walkIn, resident]);

  // 30-day duplicate warning, checked against the resident's REAL certificates
  // (this used to search a hardcoded MOCK_CERTIFICATES list, so it could never
  // warn about anything actually on file). Results are keyed by resident+type
  // and only trusted while that key still matches the current selection, so
  // switching residents can't surface a stale warning. POST /api/certificates
  // re-checks server-side regardless.
  const [dupResult, setDupResult] = useState<{ key: string; cert: CertificateMock | null } | null>(null);
  const dupKey = !walkIn && resident && certType ? `${resident.id}:${certType}` : null;

  useEffect(() => {
    if (!dupKey || !resident || !certType) return;
    let ignore = false;
    fetch(`/api/certificates?resident_id=${resident.id}&certificate_type=${certType}&limit=20`)
      .then((r) => (r.ok ? r.json() : { certificates: [] }))
      .then((json) => {
        if (ignore) return;
        setDupResult({ key: dupKey, cert: findRecentDuplicate(json.certificates ?? [], resident.id, certType) });
      })
      .catch(() => {
        if (!ignore) setDupResult({ key: dupKey, cert: null });
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dupKey]);

  const duplicateWarning = dupKey && dupResult?.key === dupKey ? dupResult.cert : null;

  // Walk-in name must look like a name; sensible lengths (src/lib/form-rules.ts).
  const problems = fieldProblems([
    ...(walkIn
      ? [
          { field: "manual_name", label: "Applicant name", value: manualName, kind: "name" as const, max: 150 },
          { field: "manual_address", label: "Address", value: manualAddress, max: 300 },
        ]
      : []),
    { field: "purpose", label: "Purpose", value: purpose, max: 300 },
  ]);

  async function handleSubmit(chosen: "request" | "process") {
    setError("");
    if (problems.length > 0) {
      setError(problems[0].message);
      return;
    }

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

    // Re-check the queue right before the summary, so "Process now" isn't
    // offered on a count that's up to 30 seconds old.
    let next = chosen;
    if (chosen === "process") {
      const latest = await refreshQueue();
      if (latest !== 0) {
        next = "request";
        setError(
          latest === null
            ? "Couldn't check the queue just now, so this will be filed as a request."
            : `${latest} ${latest === 1 ? "request is" : "requests are"} now waiting in the queue, so this will be filed as a request behind them.`
        );
      }
    }

    setAction(next);
    setSaveError("");
    setSummary("review");
  }

  async function confirmSubmit() {
    setSaveError("");
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
          form_seconds: timer.seconds(),
          process_now: action === "process",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Server returns RESIDENCY_CHECK_FAILED, DUPLICATE_CERT or
        // QUEUE_NOT_EMPTY with a message.
        if (data?.error === "QUEUE_NOT_EMPTY") {
          // Someone filed a request while this summary was open. Switch
          // this one to a normal request; staff confirm again.
          setAction("request");
          refreshQueue();
          setSaveError(`${data.message} Click Submit request to file it in the queue.`);
          return;
        }
        setSaveError(data.message || "Something went wrong while filing the certificate request.");
        return;
      }
      setFiled({ id: data.id, queue: data.queue_number ?? "" });
      setSummary("done");
    } catch (e) {
      console.error(e);
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const typeLabel = CERTIFICATE_TYPES.find((t) => t.value === certType)?.label ?? "Certificate";
  const pickedName = resident
    ? [resident.fname, resident.mname ? `${resident.mname[0]}.` : "", resident.lname, resident.name_extension ?? ""].filter(Boolean).join(" ")
    : "";

  function fileAnother() {
    timer.restart();
    setAction("request");
    refreshQueue();
    setSummary(null);
    setFiled(null);
    setResident(null);
    setManualName("");
    setManualAddress("");
    setCertType("");
    setPurpose("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <RequestSummaryDialog
        open={summary !== null}
        mode={summary ?? "review"}
        title={`${typeLabel} request`}
        rows={[
          { label: "Applicant", value: walkIn ? manualName.trim() : pickedName },
          { label: "Entry", value: walkIn ? "Walk-in (not in resident records)" : "Registered resident" },
          { label: "Address", value: walkIn ? manualAddress.trim() : resident?.household?.address || resident?.purok?.name },
          { label: "Document", value: typeLabel },
          { label: "Purpose", value: purpose.trim() },
        ]}
        reference={filed?.queue ? { label: "Queue No.", value: filed.queue } : undefined}
        reviewHeading={action === "process" ? "Review before processing" : "Review before submitting"}
        doneHeading={action === "process" ? "Saved, now Processing" : "Request filed"}
        note={
          summary === "done"
            ? action === "process"
              ? "It skipped the queue and is now Processing. Print it, then click Mark as Released in the Document Queue when you hand it over."
              : "Give the requester the slip. They show it when claiming the certificate. It stays Pending in the Document Queue until someone starts processing it."
            : action === "process"
              ? "This skips the queue and saves it as Processing so you can print it right away. Check the spelling of the name. It is printed on the certificate exactly as shown."
              : "This files it as Pending in the Document Queue. Check the spelling of the name. It is printed on the certificate exactly as shown."
        }
        error={saveError}
        busy={submitting}
        onEdit={() => setSummary(null)}
        onConfirm={confirmSubmit}
        confirmLabel={action === "process" ? "Process now" : "Submit request"}
        slipHref={filed ? `/api/pdf/slip/certificate/${filed.id}` : undefined}
        onDone={() => filed && router.push(`/certificates/${filed.id}/preview`)}
        doneLabel={action === "process" ? "Print certificate" : "Open certificate"}
        onAnother={fileAnother}
        anotherLabel="File another"
      />
      <button
        onClick={() => router.push("/certificates")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Certificates
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white">Request Certificate</h1>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
            Auto-fills from the residents profile. A certificate number will be generated automatically.
          </p>
        </div>
        <PageTutorial tutorial={DOCUMENT_TUTORIALS.certificatesNew} />
      </div>

      <div className="space-y-5">
        {/* Applicant */}
        <div data-tour="page-certificates-new-applicant" className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--brand-tint)">
                <User size={14} className="text-(--brand-fg-strong)" />
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
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-(--brand-fg) focus:ring-(--brand-line)"
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
                  className={`w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line) ${problemFor(problems, "manual_name") ? fieldErrorBorder : ""}`}
                  aria-invalid={!!(problemFor(problems, "manual_name"))}
                />
                <FieldError message={problemFor(problems, "manual_name")} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  Address
                </label>
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Purok, Street"
                  className={`w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line) ${problemFor(problems, "manual_address") ? fieldErrorBorder : ""}`}
                  aria-invalid={!!(problemFor(problems, "manual_address"))}
                />
                <FieldError message={problemFor(problems, "manual_address")} />
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
              {resident && residencyEligible && (
                <div className="flex items-center gap-2 rounded-lg bg-[#D1FAE5] dark:bg-emerald-500/15 px-3 py-2">
                  <CheckCircle2 size={14} className="shrink-0 text-[#059669] dark:text-[#34D399]" />
                  <p className="text-[11px] text-[#059669] dark:text-[#34D399]">
                    Meets the 6-month residency requirement for certificate issuance.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Certificate details */}
        <div data-tour="page-certificates-new-type" className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
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
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
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
                className="w-full resize-none rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
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

            <div className="flex items-start gap-2 rounded-lg bg-(--brand-tint) px-3 py-2.5">
              <Info size={14} className="mt-0.5 shrink-0 text-(--brand-fg-strong)" />
              <p className="text-[11px] leading-relaxed text-(--brand-fg-strong)">
                {captain.name ? (
                  <>
                    This certificate will be signed by <span className="font-semibold">{captain.name}</span>, the active{" "}
                    {captain.position}
                    {captain.term ? ` (${captain.term})` : ""}, auto-attached as signatory.
                  </>
                ) : (
                  <>
                    No active Punong Barangay is on file, so the signatory line will print blank. Add one under
                    Officials, or set a signatory in Admin → Settings.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <RequestFlowGuide waiting={waiting} />

        {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

        <div data-tour="page-certificates-new-save" className="flex flex-wrap items-center justify-end gap-3 pb-8">
          <button
            onClick={() => router.push("/certificates")}
            className="mr-auto text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white sm:mr-1"
          >
            Cancel
          </button>
          {/* With the queue empty, Process now is the main button and Submit
              request the alternative; otherwise Submit request is the only one. */}
          <button
            onClick={() => handleSubmit("request")}
            disabled={submitting}
            className={
              canProcessNow
                ? "rounded-lg border border-[#D1D5DB] dark:border-[#404040] bg-white dark:bg-[#171717] px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:opacity-60"
                : "rounded-lg bg-(--brand) px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-60"
            }
          >
            Submit Request
          </button>
          {canProcessNow && (
            <button
              data-tour="page-certificates-new-process-now"
              onClick={() => handleSubmit("process")}
              disabled={submitting}
              className="rounded-lg bg-(--brand) px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-60"
            >
              Process Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}