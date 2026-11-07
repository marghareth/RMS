// FILE: src/app/(dashboard)/certificates/[id]/page.tsx
//
// HEADER REDESIGN (Nov 2026): the title is the document type with the
// certificate number under it; status, queue no., dates and payment, plus a
// Pending → Processing → Released tracker, are in CertificateOverview. A
// "How to use" guide (src/lib/documentTutorials.ts) explains the statuses.
// The body below it is CertificateDetails (Applicant, Request, Other
// certificates), shared with the slide-over.
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import CertificateOverview, { type CertificateWithTiming } from "@/components/certificates/CertificateOverview";
import CertificateDetails from "@/components/certificates/CertificateDetails";
import PageTutorial from "@/components/shared/PageTutorial";
import { DOCUMENT_TUTORIALS } from "@/lib/documentTutorials";
import {
  CertificateMock,
  certTypeLabel,
} from "@/lib/mock/certificates";

export default function CertificateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const certId = Number(params.id);

  // GET /api/certificates/[id]
  const [certificate, setCertificate] = useState<CertificateWithTiming | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCertificate() {
      setLoading(true);
      try {
        const res = await fetch(`/api/certificates/${certId}`);
        if (!res.ok) throw new Error("Not found");
        setCertificate(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCertificate();
  }, [certId]);

  // Other certificates issued to the same resident — full issuance history.
  // GET /api/certificates?resident_id=... already returns newest-first.
  const [residentHistory, setResidentHistory] = useState<CertificateMock[]>([]);

  useEffect(() => {
    const residentId = certificate?.resident_id;
    const request = residentId
      ? fetch(`/api/certificates?resident_id=${residentId}`).then((r) => r.json())
      : Promise.resolve({ certificates: [] });

    request
      .then((data) => {
        const list: CertificateMock[] = data.certificates ?? [];
        setResidentHistory(certificate ? list.filter((c) => c.id !== certificate.id) : []);
      })
      .catch(console.error);
  }, [certificate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
      </div>
    );
  }

  if (!certificate) {
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

  return (
    <div>
      {/* Header — redesigned Nov 2026: the document type is the title, the
          certificate number sits under it, and the status, queue number,
          dates and payment moved into CertificateOverview below instead of
          being squeezed into one line of pills and middots. */}
      <button
        onClick={() => router.push("/certificates")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Certificates
      </button>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight text-[#1F2937] dark:text-white">
            {certTypeLabel(certificate.certificate_type)}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            <span className="font-mono tabular-nums text-[#374151] dark:text-[#D4D4D4]">{certificate.certificate_no}</span>
            {certificate.flagged_manual && (
              <span className="border-l border-[#E5E7EB] pl-3 dark:border-[#333333]">Walk-in, not linked to the RBI</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageTutorial tutorial={DOCUMENT_TUTORIALS.certificateDetail} />
          <button
            data-tour="page-certificates-detail-preview"
            onClick={() => router.push(`/certificates/${certId}/preview`)}
            className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
          >
            <Printer size={14} />
            Preview / Print
          </button>
        </div>
      </div>

      <div className="mb-5">
        <CertificateOverview certificate={certificate} />
      </div>

      <CertificateDetails
        certificate={certificate}
        history={residentHistory}
        onOpenOther={(id) => router.push(`/certificates/${id}`)}
        layout="split"
      />
    </div>
  );
}