// FILE: src/app/(dashboard)/certificates/[id]/preview/page.tsx
//
// Nov 2026: the page shows the actual PDF (GET /api/pdf/certificate/[id])
// instead of an HTML look-alike, so what you see here is exactly what
// prints and downloads: the full barangay format with logos, officials,
// signatures and the verification QR. Print prints that PDF.
//
// FIX (Nov 2026): the embedded PDF showed "refused to connect" because the
// site-wide anti-framing headers also blocked the app's own PDF routes
// (now allowed for same-origin pages in next.config.ts). Print now prints
// the loaded document (or loads it on its own if the preview hasn't
// finished), and Download PDF really downloads the file instead of opening
// a new tab that pop-up blockers could stop. Both show "Preparing…" while
// the PDF is being made.
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, FileText, FileEdit, Pencil } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { CertificateMock, residentFullName } from "@/lib/mock/certificates";
import { CertificateTemplateMock } from "@/lib/mock/certificateTemplates";
import { useCan } from "@/lib/hooks/useCan";
import { downloadPdf, printFrame, printPdf } from "@/lib/print-pdf";

/** Tells the Processing Time report this document was printed (only the first time counts). */
function markPrinted(kind: "certificate" | "barangay-id", id: number) {
  fetch("/api/timing/printed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id }),
  }).catch(() => {});
}

export default function CertificatePreviewPage() {
  const can = useCan();
  const router = useRouter();
  const params = useParams();
  const certId = Number(params.id);
  // Bumped after a correction is saved so the PDF reloads with it.
  const [pdfVersion, setPdfVersion] = useState(0);
  const pdfFrame = useRef<HTMLIFrameElement>(null);
  // True once the embedded PDF has finished loading, so Print can use it.
  const [pdfReady, setPdfReady] = useState(false);

  const [certificate, setCertificate] = useState<CertificateMock | null>(null);
  const [certLoading, setCertLoading] = useState(true);
  const [template, setTemplate] = useState<CertificateTemplateMock | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);

  // Per-document correction of the printed name/address (see the schema
  // comment on Certificate.override_full_name). Fixes a typo on THIS
  // certificate only — it never touches the resident's record.
  const [editingOverride, setEditingOverride] = useState(false);
  const [overrideNameDraft, setOverrideNameDraft] = useState("");
  const [overrideAddressDraft, setOverrideAddressDraft] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  // Reset to a "loading" state the instant certId changes, before either
  // fetch effect below even runs — done during render rather than inside
  // an effect. This is React's documented pattern for resetting state when
  // a prop changes (see "Adjusting some state when a prop changes" at
  // https://react.dev/learn/you-might-not-need-an-effect), and it's exempt
  // from the set-state-in-effect rule because it isn't inside useEffect.
  const [loadedForId, setLoadedForId] = useState(certId);
  if (certId !== loadedForId) {
    setLoadedForId(certId);
    setCertificate(null);
    setCertLoading(true);
    setTemplate(null);
    setTemplateLoading(true);
  }

  // GET /api/certificates/[id]
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/certificates/${certId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Certificate not found");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setCertificate(data);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setCertificate(null);
      })
      .finally(() => {
        if (!cancelled) setCertLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [certId]);

  // Pulls the editable template for this certificate's type (see
  // /certificates/templates) instead of a hardcoded per-type switch-case, and
  // interpolates it with this certificate's real data.
  useEffect(() => {
    if (!certificate) return; // nothing to fetch yet — `loading` below already
    // accounts for this via `certificate !== null`, so there's no need to
    // touch templateLoading here.
    let cancelled = false;
    fetch(`/api/certificate-templates/${certificate.certificate_type}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setTemplate(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [certificate]);

  // Only genuinely "not found" once the certificate fetch has settled — and,
  // if a certificate was found, once its template has settled too. Without
  // this, `!certificate` is briefly true on every load (both start as
  // null), which flashed the "Certificate not found" screen for a second
  // or two before the real data arrived.
  const loading = certLoading || (certificate !== null && templateLoading);

  const pdfUrl = `/api/pdf/certificate/${certId}?v=${pdfVersion}`;

  function handlePrint() {
    markPrinted("certificate", Number(certId));
    // Print the certificate itself (the same PDF as the download), never
    // the web page. Use the preview if it has loaded; otherwise load the
    // PDF on its own just for printing.
    if (pdfReady && printFrame(pdfFrame.current)) return;
    printPdf(pdfUrl);
  }

  function handleDownloadPdf() {
    markPrinted("certificate", Number(certId));
    // Renders the same template server-side via @react-pdf/renderer and
    // saves it as e.g. CERT-2026-000218.pdf.
    downloadPdf(pdfUrl, `${certificate?.certificate_no ?? `certificate-${certId}`}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
      </div>
    );
  }

  if (!certificate || !template) {
    return (
      <EmptyState
        icon={FileText}
        title="Certificate not found"
        description="This certificate doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/certificates")}
            className="rounded-lg bg-(--brand) px-4 py-2 text-[12px] font-bold text-white transition hover:bg-(--brand-hover)"
          >
            Back to Certificates
          </button>
        }
      />
    );
  }

  const applicantName =
    certificate.override_full_name ||
    (certificate.resident ? residentFullName(certificate.resident) : certificate.manual_name ?? "—");
  const hasOverride = !!(certificate.override_full_name || certificate.override_address);

  // What the fields would print without a correction — shown as the input
  // placeholders so staff can see what they're overriding.
  const originalName = certificate.resident
    ? residentFullName(certificate.resident).toUpperCase()
    : (certificate.manual_name ?? "").toUpperCase();
  const originalAddress =
    certificate.resident?.household?.address || certificate.manual_address || "this barangay";

  function openOverridePanel() {
    setOverrideNameDraft(certificate?.override_full_name ?? "");
    setOverrideAddressDraft(certificate?.override_address ?? "");
    setOverrideError("");
    setEditingOverride(true);
  }

  async function handleSaveOverride() {
    setSavingOverride(true);
    setOverrideError("");
    try {
      const res = await fetch(`/api/certificates/${certId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Empty string clears the correction back to the resident's real data.
        body: JSON.stringify({
          override_full_name: overrideNameDraft,
          override_address: overrideAddressDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOverrideError(data.message || "Failed to save the correction.");
        return;
      }
      // PATCH returns the bare certificate row (no relations), so merge it
      // into what we already have instead of replacing it.
      setCertificate((prev) => (prev ? { ...prev, ...data } : prev));
      setEditingOverride(false);
      setPdfVersion((v) => v + 1);
      setPdfReady(false); // the corrected PDF reloads below
    } catch (e) {
      console.error(e);
      setOverrideError("Something went wrong. Please try again.");
    } finally {
      setSavingOverride(false);
    }
  }

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div data-tour="page-certificates-preview-toolbar" className="mb-5 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/certificates/${certId}`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to Certificate
        </button>
        <div className="flex items-center gap-2">
          {can("certificates:write") && (<button
            data-tour="page-certificates-preview-override"
            onClick={openOverridePanel}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            <Pencil size={14} />
            Correct Name / Address
          </button>)}
          <button
            onClick={() => router.push("/certificates/templates")}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            <FileEdit size={14} />
            Edit Template
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      {editingOverride && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 print:hidden">
          <div className="mb-1 flex items-center gap-2">
            <Pencil size={14} className="text-(--brand-fg-strong)" />
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
              Correct This Document
            </p>
          </div>
          <p className="mb-4 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
            Type the correct spelling below. This only changes what prints on this one certificate — the
            resident&apos;s record and every other certificate stay as they are. Leave a field blank to use the
            original.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Full Name (as printed)
              </label>
              <input
                value={overrideNameDraft}
                onChange={(e) => setOverrideNameDraft(e.target.value)}
                placeholder={originalName}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-transparent px-3 py-2.5 text-[13px] uppercase text-[#1F2937] dark:text-white outline-none focus:border-(--brand-line)"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Address (as printed)
              </label>
              <input
                value={overrideAddressDraft}
                onChange={(e) => setOverrideAddressDraft(e.target.value)}
                placeholder={originalAddress}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-transparent px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none focus:border-(--brand-line)"
              />
            </div>
          </div>
          {overrideError && (
            <p className="mt-3 text-[12px] font-semibold text-[#DC2626] dark:text-[#F87171]">{overrideError}</p>
          )}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={() => setEditingOverride(false)}
              disabled={savingOverride}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOverride}
              disabled={savingOverride}
              className="rounded-lg bg-(--brand) px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-50"
            >
              {savingOverride ? "Saving..." : "Save Correction"}
            </button>
          </div>
        </div>
      )}

      {!editingOverride && hasOverride && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 print:hidden">
          <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
            This certificate prints a corrected name/address that differs from the resident&apos;s record.
          </p>
          {can("certificates:write") && (<button
            onClick={openOverridePanel}
            className="text-[12px] font-bold text-amber-800 dark:text-amber-300 underline"
          >
            Edit
          </button>)}
        </div>
      )}

      {/* The certificate exactly as it prints */}
      <div data-tour="page-certificates-preview-document" className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-[#E9EAEC] bg-[#525659] shadow-sm dark:border-[#262626]">
        {!pdfReady && (
          <p className="py-3 text-center text-[12px] text-[#E5E7EB]">Preparing the certificate…</p>
        )}
        <iframe
          key={pdfVersion}
          ref={pdfFrame}
          onLoad={() => setPdfReady(true)}
          src={`${pdfUrl}#view=FitH&toolbar=0`}
          title={`Certificate ${certificate.certificate_no}`}
          className="block h-[calc(100vh-180px)] min-h-180 w-full"
        />
      </div>
      <p className="mx-auto mt-2 max-w-4xl text-[11px] text-[#9CA3AF] print:hidden">
        Applicant: {applicantName} · Certificate No. {certificate.certificate_no}
        {certificate.flagged_manual ? " · Walk-in, not yet in the RBI" : ""}
      </p>
    </div>
  );
}