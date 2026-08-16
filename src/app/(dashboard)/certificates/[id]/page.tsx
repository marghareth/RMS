// FILE: src/app/(dashboard)/certificates/[id]/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, User, Calendar, ShieldCheck, Printer, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">{label}</p>
        <p className="text-[13px] text-[#1F2937] dark:text-white">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function CertificateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const certId = Number(params.id);

  // GET /api/certificates/[id]
  const [certificate, setCertificate] = useState<CertificateMock | null>(null);
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
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
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            Back to Certificates
          </button>
        }
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/certificates")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Certificates
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">{certificate.certificate_no}</h1>
            <span className="inline-flex items-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">
              {certTypeLabel(certificate.certificate_type)}
            </span>
            <StatusBadge status={certificate.status} />
            {certificate.flagged_manual && (
              <span className="inline-flex items-center rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-[#D97706] dark:text-[#FBBF24]">
                Walk-in
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
            {certificate.issued_at
              ? `Released ${formatISODateTime(certificate.issued_at)}`
              : `Requested ${formatISODateTime(certificate.requested_at)} · Queue #${certificate.queue_number}`}
          </p>
        </div>
        <button
          onClick={() => router.push(`/certificates/${certId}/preview`)}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
        >
          <Printer size={14} />
          Preview / Print
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* ── Left: certificate details ── */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15">
                <User size={14} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Applicant</p>
            </div>
            {certificate.resident ? (
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <InfoRow icon={User} label="Full Name" value={residentFullName(certificate.resident)} />
                <InfoRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatISODate(certificate.resident.birthdate)}
                />
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

          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Purpose</p>
            <p className="text-[13px] leading-relaxed text-[#374151] dark:text-[#D4D4D4]">{certificate.purpose}</p>
          </div>

          {/* Issuance history for this resident */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <div className="mb-3 flex items-center gap-2">
              <History size={14} className="text-[#6B7280] dark:text-[#A3A3A3]" />
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
                Other Certificates for This Resident ({residentHistory.length})
              </p>
            </div>
            {!certificate.resident ? (
              <p className="py-3 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                Walk-in entries aren&apos;t linked to a resident record, so no issuance history is available.
              </p>
            ) : residentHistory.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No other certificates issued yet.</p>
            ) : (
              <div className="space-y-2">
                {residentHistory.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/certificates/${c.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#F4F5F7] dark:border-[#262626] px-3 py-2.5 text-left transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                  >
                    <div>
                      <p className="text-[12px] font-bold text-[#1F2937] dark:text-white">{certTypeLabel(c.certificate_type)}</p>
                      <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{c.purpose}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">{formatISODate(certDisplayDate(c))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: issuance info ── */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <p className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Issuance Info</p>
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
    </div>
  );
}