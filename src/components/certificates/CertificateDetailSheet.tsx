// src/components/certificates/CertificateDetailSheet.tsx
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
import { FileText, User, Calendar, ShieldCheck, Printer, History, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  CertificateMock,
  certTypeLabel,
  residentFullName,
  formatISODateTime,
  formatISODate,
  certDisplayDate,
  PAYMENT_STATUS_LABELS,
} from "@/lib/mock/certificates";

interface CertificateDetailSheetProps {
  /** The certificate to show, or null to keep the sheet closed. */
  certificateId: number | null;
  onClose: () => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <p className="text-[13px] text-[#1F2937]">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function CertificateDetailSheet({ certificateId, onClose }: CertificateDetailSheetProps) {
  const router = useRouter();
  const open = certificateId !== null;

  // `activeId` starts in sync with the `certificateId` prop but can diverge
  // when the person clicks into "Other Certificates for This Resident" —
  // that's still browsing within this same sheet/module, so it updates
  // in place rather than closing and reopening via the parent.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [certificate, setCertificate] = useState<CertificateMock | null>(null);
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
      <SheetContent widthClassName="max-w-4xl" className="p-0">
        {loading || !certificate ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Certificate not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>{certificate.certificate_no}</SheetTitle>
                  <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                    {certTypeLabel(certificate.certificate_type)}
                  </span>
                  <StatusBadge status={certificate.status} />
                  {certificate.flagged_manual && (
                    <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold text-[#D97706]">
                      Walk-in
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                  {certificate.issued_at
                    ? `Released ${formatISODateTime(certificate.issued_at)}`
                    : `Requested ${formatISODateTime(certificate.requested_at)} · Queue #${certificate.queue_number}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/certificates/${activeId}/preview`)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
                >
                  <Printer size={13} />
                  Preview / Print
                </button>
                <button
                  onClick={() => router.push(`/certificates/${activeId}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                {/* ── Left: certificate details ── */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
                        <User size={14} className="text-[#1D4ED8]" />
                      </div>
                      <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Applicant</p>
                    </div>
                    {certificate.resident ? (
                      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                        <InfoRow icon={User} label="Full Name" value={residentFullName(certificate.resident)} />
                        <InfoRow icon={Calendar} label="Date of Birth" value={formatISODate(certificate.resident.birthdate)} />
                        <InfoRow icon={ShieldCheck} label="Purok" value={certificate.resident.purok?.name} />
                        <InfoRow icon={FileText} label="Resident Record" value={`Linked · RBI #${certificate.resident.id}`} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                        <InfoRow icon={User} label="Full Name" value={certificate.manual_name} />
                        <InfoRow icon={ShieldCheck} label="Address" value={certificate.manual_address} />
                        <InfoRow icon={FileText} label="Resident Record" value="Not linked / walk-in entry" />
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Purpose</p>
                    <p className="text-[13px] leading-relaxed text-[#374151]">{certificate.purpose}</p>
                  </div>

                  {/* Issuance history for this resident */}
                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <History size={14} className="text-[#6B7280]" />
                      <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                        Other Certificates for This Resident ({residentHistory.length})
                      </p>
                    </div>
                    {!certificate.resident ? (
                      <p className="py-3 text-center text-[12px] text-[#9CA3AF]">
                        Walk-in entries aren&apos;t linked to a resident record, so no issuance history is available.
                      </p>
                    ) : residentHistory.length === 0 ? (
                      <p className="py-3 text-center text-[12px] text-[#9CA3AF]">No other certificates issued yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {residentHistory.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setActiveId(c.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-[#F4F5F7] px-3 py-2.5 text-left transition hover:bg-[#F9FAFB]"
                          >
                            <div>
                              <p className="text-[12px] font-bold text-[#1F2937]">{certTypeLabel(c.certificate_type)}</p>
                              <p className="text-[11px] text-[#9CA3AF]">{c.purpose}</p>
                            </div>
                            <span className="shrink-0 text-[11px] text-[#6B7280]">{formatISODate(certDisplayDate(c))}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Right: issuance info ── */}
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <p className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Issuance Info</p>
                    <InfoRow icon={ShieldCheck} label="Issued By" value={certificate.issuer.username} />
                    <InfoRow
                      icon={Calendar}
                      label="Date Issued"
                      value={certificate.issued_at ? formatISODateTime(certificate.issued_at) : "Awaiting release"}
                    />
                    <InfoRow icon={FileText} label="Certificate No." value={certificate.certificate_no} />
                    <InfoRow icon={FileText} label="Queue No." value={certificate.queue_number} />
                    <InfoRow icon={ShieldCheck} label="Payment" value={PAYMENT_STATUS_LABELS[certificate.payment_status]} />
                  </div>
                </div>
              </div>
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}