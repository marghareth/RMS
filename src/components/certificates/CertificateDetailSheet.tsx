// FILE: src/components/certificates/CertificateDetailSheet.tsx
//
// BODY REDESIGN (Nov 2026): the Applicant / Purpose / Issuance Info boxes
// are replaced by CertificateDetails (Applicant, Request, Other
// certificates), shared with the full page, without repeating what the
// header already shows.
//
// HEADER REDESIGN (Nov 2026): the title is now the document type with the
// certificate number under it, and the status / queue no. / dates /
// payment plus a Pending → Processing → Released tracker live in
// CertificateOverview at the top of the body, same as the full page.
//
// The certificate detail + issuance-history view, as a slide-over instead
// of a full page navigation. Content mirrors
// (dashboard)/certificates/[id]/page.tsx (which still exists for direct
// links/bookmarks), just re-homed so it can render inside <Sheet> and be
// driven by a `certificateId` prop from the certificates list page.
//
// "Other Certificates for This Resident" switches the sheet to that
// certificate in place (still within this module), while "Preview / Print"
// stays a real page navigation since it's a distinct print layout — not a
// detail view — per the established cross-link convention.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Printer, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import CertificateOverview, { type CertificateWithTiming } from "@/components/certificates/CertificateOverview";
import CertificateDetails from "@/components/certificates/CertificateDetails";
import {
  CertificateMock,
  certTypeLabel,
} from "@/lib/mock/certificates";

interface CertificateDetailSheetProps {
  /** The certificate to show, or null to keep the sheet closed. */
  certificateId: number | null;
  onClose: () => void;
}

export default function CertificateDetailSheet({ certificateId, onClose }: CertificateDetailSheetProps) {
  const router = useRouter();
  const open = certificateId !== null;

  // `activeId` starts in sync with the `certificateId` prop but can diverge
  // when the person clicks into "Other Certificates for This Resident" —
  // that's still browsing within this same sheet/module, so it updates
  // in place rather than closing and reopening via the parent.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [certificate, setCertificate] = useState<CertificateWithTiming | null>(null);
  const [loading, setLoading] = useState(true);
  const [residentHistory, setResidentHistory] = useState<CertificateMock[]>([]);

  const [syncedPropId, setSyncedPropId] = useState<number | null>(null);
  if (certificateId !== null && certificateId !== syncedPropId) {
    setSyncedPropId(certificateId);
    setActiveId(certificateId);
  } else if (certificateId === null && syncedPropId !== null) {
    setSyncedPropId(null);
  }

  // Whenever `activeId` changes — either from the prop sync above, or from
  // clicking into resident history — reset synchronously during render so
  // the fetch effect below never needs to call setState at the top of its
  // body (which can trigger cascading renders).
  const [syncedActiveId, setSyncedActiveId] = useState<number | null>(null);
  if (activeId !== null && activeId !== syncedActiveId) {
    setSyncedActiveId(activeId);
    setCertificate(null);
    setLoading(true);
  }

  useEffect(() => {
    if (activeId === null) return;
    let cancelled = false;

    fetch(`/api/certificates/${activeId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data) => { if (!cancelled) setCertificate(data); })
      .catch(() => { if (!cancelled) setCertificate(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeId]);

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

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || !certificate ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Certificate not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Certificate not found"
                  description="This certificate doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="min-w-0">
                <SheetTitle>{certTypeLabel(certificate.certificate_type)}</SheetTitle>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                  <span className="font-mono tabular-nums text-[#374151] dark:text-[#D4D4D4]">{certificate.certificate_no}</span>
                  {certificate.flagged_manual && (
                    <span className="border-l border-[#E5E7EB] pl-3 dark:border-[#333333]">Walk-in</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/certificates/${activeId}/preview`)}
                  className="flex items-center gap-1.5 rounded-lg bg-(--brand) px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-(--brand-hover)"
                >
                  <Printer size={13} />
                  Preview / Print
                </button>
                <button
                  onClick={() => router.push(`/certificates/${activeId}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              <div className="mb-4">
                <CertificateOverview certificate={certificate} />
              </div>
              <CertificateDetails
                certificate={certificate}
                history={residentHistory}
                onOpenOther={(id) => setActiveId(id)}
              />
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}