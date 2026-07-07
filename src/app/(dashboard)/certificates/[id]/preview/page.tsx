"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, FileText, FileEdit } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  MOCK_CERTIFICATES,
  MOCK_ACTIVE_CAPTAIN,
  MOCK_BARANGAY_INFO,
  CertificateMock,
  residentFullName,
  formatISODate,
} from "@/lib/mock/certificates";
import { getMockTemplate, renderTemplate } from "@/lib/mock/certificateTemplates";

export default function CertificatePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const certId = Number(params.id);

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // In place of the real GET /api/certificates/[id] call. Swap for the
  // commented block below once the database is connected.
  const [certificate] = useState<CertificateMock | null>(
    () => MOCK_CERTIFICATES.find((c) => c.id === certId) ?? null
  );

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [certificate, setCertificate] = useState<CertificateMock | null>(null);
  // useEffect(() => {
  //   fetch(`/api/certificates/${certId}`).then((r) => r.json()).then(setCertificate).catch(console.error);
  // }, [certId]);

  // ── TEMPLATE LOOKUP ───────────────────────────────────────────────────────
  // Pulls the editable template for this certificate's type (see
  // /certificates/templates) instead of a hardcoded per-type switch-case, and
  // interpolates it with this certificate's real data.
  const template = useMemo(
    () => (certificate ? getMockTemplate(certificate.certificate_type) : null),
    [certificate]
  );

  // ── REAL TEMPLATE FETCH (disabled until API/DB is wired up) ─────────────
  // const [template, setTemplate] = useState<CertificateTemplateMock | null>(null);
  // useEffect(() => {
  //   if (!certificate) return;
  //   fetch(`/api/certificate-templates/${certificate.certificate_type}`)
  //     .then((r) => r.json())
  //     .then(setTemplate)
  //     .catch(console.error);
  // }, [certificate]);

  const mergedValues = useMemo<Record<string, string>>(() => {
    if (!certificate) {
      return {
        full_name: "",
        address: "",
        purpose: "",
        captain_name: "",
        captain_position: "",
        barangay_name: "",
        city: "",
        province: "",
        date_issued: "",
      };
    }
    const name = certificate.resident
      ? residentFullName(certificate.resident).toUpperCase()
      : (certificate.manual_name ?? "").toUpperCase();
    const address = certificate.resident?.address ?? certificate.manual_address ?? "this barangay";
    return {
      full_name: name,
      address,
      purpose: certificate.purpose,
      captain_name: MOCK_ACTIVE_CAPTAIN.name,
      captain_position: MOCK_ACTIVE_CAPTAIN.position,
      barangay_name: MOCK_BARANGAY_INFO.name,
      city: MOCK_BARANGAY_INFO.city,
      province: MOCK_BARANGAY_INFO.province,
      date_issued: formatISODate(certificate.issued_at) ?? "",
    };
  }, [certificate]);

  const renderedTitle = template ? renderTemplate(template.title, mergedValues) : "";
  const renderedBody = template ? renderTemplate(template.body, mergedValues) : "";
  const renderedClosing = template ? renderTemplate(template.closing_line, mergedValues) : "";

  function handlePrint() {
    // ── MOCK: browser print dialog stands in for a generated PDF ─────────
    window.print();

    // ── REAL PDF GENERATION (disabled until API/DB is wired up) ───────────
    // Would hit GET /api/pdf/certificate/[id], which renders the same
    // template server-side via @react-pdf/renderer (see src/lib/pdf.ts),
    // pulling the merged template from CertificateTemplate the same way
    // this page does, and streams back a downloadable/printable PDF file.
    // window.open(`/api/pdf/certificate/${certId}`, "_blank");
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
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Back to Certificates
          </button>
        }
      />
    );
  }

  const applicantName = certificate.resident
    ? residentFullName(certificate.resident)
    : certificate.manual_name ?? "—";

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="mb-5 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/certificates/${certId}`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
        >
          <ArrowLeft size={14} />
          Back to Certificate
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/certificates/templates")}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
          >
            <FileEdit size={14} />
            Edit Template
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Printable document */}
      <div className="mx-auto max-w-3xl rounded-xl border border-[#E9EAEC] bg-white p-12 shadow-sm print:border-none print:p-0 print:shadow-none">
        {/* Letterhead */}
        <div className="mb-8 flex flex-col items-center border-b-2 border-[#1F2937] pb-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#3B82F6]">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" />
              <rect x="9" y="12" width="6" height="10" fill="#3B82F6" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
            Republic of the Philippines
          </p>
          <p className="text-[11px] text-[#6B7280]">
            {MOCK_BARANGAY_INFO.province}, {MOCK_BARANGAY_INFO.region}
          </p>
          <p className="text-[11px] text-[#6B7280]">City of {MOCK_BARANGAY_INFO.city}</p>
          <p className="mt-2 text-xl font-black uppercase tracking-wide text-[#1F2937]">
            Office of the {MOCK_BARANGAY_INFO.name}
          </p>
        </div>

        {/* Title */}
        <h2 className="mb-8 text-center text-lg font-black uppercase tracking-widest text-[#1F2937]">
          {renderedTitle}
        </h2>

        {/* Body */}
        <div className="space-y-5 text-[13px] leading-loose text-[#374151]">
          <p>TO WHOM IT MAY CONCERN:</p>
          <p className="indent-8 text-justify">{renderedBody}</p>
          <p className="indent-8 text-justify">
            This certification is being issued upon the request of the above-named person for the purpose of:
          </p>
          <p className="rounded-lg bg-[#F9FAFB] px-4 py-3 text-center font-semibold uppercase text-[#1F2937]">
            {certificate.purpose}
          </p>
          <p className="indent-8 text-justify">{renderedClosing}</p>
        </div>

        {/* Signatory */}
        <div className="mt-16 flex justify-end">
          <div className="text-center">
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">
              {MOCK_ACTIVE_CAPTAIN.name}
            </p>
            <div className="mt-1 w-56 border-t border-[#1F2937] pt-1">
              <p className="text-[11px] text-[#6B7280]">{MOCK_ACTIVE_CAPTAIN.position}</p>
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div className="mt-10 flex items-center justify-between border-t border-[#F4F5F7] pt-4 text-[10px] text-[#9CA3AF]">
          <span>Certificate No. {certificate.certificate_no}</span>
          <span>Applicant: {applicantName}</span>
          {certificate.flagged_manual && <span className="font-semibold text-[#D97706]">Walk-in / Not Yet in RBI</span>}
        </div>
      </div>
    </div>
  );
}