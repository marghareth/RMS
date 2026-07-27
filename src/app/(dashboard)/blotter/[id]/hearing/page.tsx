// FILE: src/app/(dashboard)/blotter/[id]/hearing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileX } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface HearingCase {
  id: number;
  case_number: string;
  complainant_name: string;
  complainant_address: string | null;
  respondent_name: string;
  incident_narrative: string;
  incident_date: string;
  hearing_date: string | null;
  status: string;
}

const BARANGAY_NAME = "Barangay Quisol";
const CITY = "Danao City";
const PROVINCE = "Cebu";
const CAPTAIN_NAME = "Pedro C. Barriga Garcia";
const CAPTAIN_POSITION = "Punong Barangay";

function formatLongDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function BlotterHearingNoticePage() {
  const router = useRouter();
  const params = useParams();
  const caseId = Number(params.id);

  const [blotterCase, setBlotterCase] = useState<HearingCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/blotter/${caseId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setBlotterCase(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !blotterCase) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={FileX}
          title="Case not found"
          description="This blotter case doesn't exist or may have been removed."
        />
      </div>
    );
  }

  const hearingDateLabel = formatLongDate(blotterCase.hearing_date);
  const hearingTimeLabel = formatTime(blotterCase.hearing_date);

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/blotter/${caseId}`)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
        >
          <ArrowLeft size={15} /> Back to case
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
        >
          <Printer size={14} /> Print Notice
        </button>
      </div>

      {/* Printable hearing notice */}
      <div className="rounded-2xl border border-[#E9EAEC] bg-white p-10 shadow-sm print:border-none print:shadow-none">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
            Republic of the Philippines
          </p>
          <p className="mt-1 text-[16px] font-black uppercase tracking-wide text-[#1F2937]">
            {BARANGAY_NAME}
          </p>
          <p className="text-[11px] text-[#6B7280]">{CITY}, {PROVINCE}</p>
          <p className="mt-4 text-[14px] font-black uppercase tracking-widest text-[#1F2937]">
            Notice of Hearing
          </p>
          <p className="mt-1 font-mono text-[12px] text-[#6B7280]">Case No. {blotterCase.case_number}</p>
        </div>

        <p className="text-[13px] leading-relaxed text-[#374151]">
          Notice is hereby given to the parties involved in the above-captioned barangay case that a hearing
          has been scheduled as follows:
        </p>

        <div className="my-6 grid grid-cols-2 gap-4 rounded-xl border border-[#E9EAEC] bg-[#F9FAFB] p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Date</p>
            <p className="text-[13px] font-bold text-[#1F2937]">{hearingDateLabel ?? "To be scheduled"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Time</p>
            <p className="text-[13px] font-bold text-[#1F2937]">{hearingTimeLabel ?? "\u2014"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Venue</p>
            <p className="text-[13px] text-[#1F2937]">Barangay Hall, {BARANGAY_NAME}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Status</p>
            <p className="text-[13px] text-[#1F2937]">{blotterCase.status}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Complainant</p>
            <p className="text-[13px] font-bold text-[#1F2937]">{blotterCase.complainant_name}</p>
            {blotterCase.complainant_address && (
              <p className="text-[12px] text-[#6B7280]">{blotterCase.complainant_address}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Respondent</p>
            <p className="text-[13px] font-bold text-[#1F2937]">{blotterCase.respondent_name}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Nature of Complaint
          </p>
          <p className="text-[13px] leading-relaxed text-[#374151]">{blotterCase.incident_narrative}</p>
        </div>

        <p className="text-[13px] leading-relaxed text-[#374151]">
          Both parties are hereby directed to appear personally, together with their witnesses if any, on
          the date and time above stated. Failure to appear without justifiable cause may be construed
          as a waiver of the right to be heard, and the case may be acted upon based on the evidence
          on record.
        </p>

        <div className="mt-16 flex justify-end">
          <div className="text-center">
            <p className="w-48 border-t border-[#1F2937] pt-2 text-[12px] font-bold text-[#1F2937]">
              {CAPTAIN_NAME}
            </p>
            <p className="text-[11px] text-[#6B7280]">{CAPTAIN_POSITION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}