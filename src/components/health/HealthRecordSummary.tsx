// FILE: src/components/health/HealthRecordSummary.tsx
//
// The body of a health record (Nov 2026), shared by the slide-over
// (HealthRecordDetailSheet) and the full page (/health/[id]).
//
// REDESIGN: the old layout showed the record type three times (sheet
// header, a big colored banner, the banner's subtitle), the record number
// twice, "recorded on … by …" twice (banner + Record Details card), the
// purok twice (under the name and again as a row), plus a placeholder
// avatar and a separate "Quick Actions" card. Each fact now appears once,
// in the order staff read a health record:
//
//   1. Patient — who it's about, with age, sex, purok and birthdate on one
//      line, and a link to their RBI profile.
//   2. Notes and findings — the actual content, given the most room, with
//      when and by whom it was recorded underneath.
//   3. Follow-up — add another record or a vaccination for the same
//      resident (only for roles that can add health records).
//
// The record type and number stay in the header of whichever view uses
// this, so they aren't repeated here.
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";

export interface HealthRecordForSummary {
  id: number;
  resident_id: number;
  record_type: string;
  notes: string | null;
  recorded_at: string;
  resident: {
    id: number;
    fname: string;
    lname: string;
    birthdate: string;
    sex: string;
    purok?: { name: string } | null;
  };
  recorder: { id: number; username: string };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
/** "FEMALE" → "Female" */
function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

const LABEL = "text-[12px] text-[#6B7280] dark:text-[#A3A3A3]";
const CARD = "rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]";

export default function HealthRecordSummary({
  record,
  canAdd,
}: {
  record: HealthRecordForSummary;
  /** Show the follow-up buttons (roles with health:write). */
  canAdd: boolean;
}) {
  const router = useRouter();
  const r = record.resident;
  const facts = [
    `${calcAge(r.birthdate)} years old`,
    titleCase(r.sex),
    r.purok?.name ?? "No purok",
    `Born ${fmtDate(r.birthdate)}`,
  ];

  return (
    <div className="space-y-4">
      {/* ── Patient ── */}
      <section data-tour="page-health-detail-resident" className={`${CARD} flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4`}>
        <div className="min-w-0">
          <p className={LABEL}>Patient</p>
          <p className="mt-0.5 text-[16px] font-semibold text-[#1F2937] dark:text-white">
            {r.fname} {r.lname}
          </p>
          <p className="mt-1 flex flex-wrap gap-y-1 text-[13px] text-[#4B5563] dark:text-[#D4D4D4]">
            {facts.map((f, i) => (
              <span key={f} className={i > 0 ? "border-l border-[#E5E7EB] pl-2.5 ml-2.5 dark:border-[#333333]" : ""}>
                {f}
              </span>
            ))}
          </p>
        </div>
        <button
          onClick={() => router.push(`/residents/${record.resident_id}`)}
          className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-(--brand-fg) transition hover:underline"
        >
          View profile <ArrowRight size={14} />
        </button>
      </section>

      {/* ── Notes and findings ── */}
      <section data-tour="page-health-detail-record" className={CARD}>
        <div className="px-5 pb-4 pt-4">
          <p className={LABEL}>Notes and findings</p>
          {record.notes ? (
            <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#1F2937] dark:text-[#E5E5E5]">{record.notes}</p>
          ) : (
            <p className="mt-1.5 text-[14px] text-[#9CA3AF] dark:text-[#737373]">No notes were written for this record.</p>
          )}
        </div>
        <p className="border-t border-[#F0F1F3] dark:border-[#262626] px-5 py-3 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
          Recorded <span className="font-medium text-[#374151] dark:text-[#D4D4D4]">{fmtDateTime(record.recorded_at)}</span> by{" "}
          <span className="font-medium text-[#374151] dark:text-[#D4D4D4]">{record.recorder.username}</span>
        </p>
      </section>

      {/* ── Follow-up for the same resident ── */}
      {canAdd && (
        <section data-tour="page-health-detail-quick" className="flex flex-wrap items-center gap-3 px-1">
          <p className={LABEL}>Add for {r.fname}:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push(`/health/new?resident_id=${record.resident_id}`)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-3 py-2 text-[12.5px] font-semibold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
            >
              <Plus size={14} /> Health record
            </button>
            <button
              onClick={() => router.push(`/health/vaccinations/new?resident_id=${record.resident_id}`)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-3 py-2 text-[12.5px] font-semibold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
            >
              <Plus size={14} /> Vaccination
            </button>
          </div>
        </section>
      )}
    </div>
  );
}