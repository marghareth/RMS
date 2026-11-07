// FILE: src/components/certificates/CertificateOverview.tsx
//
// The summary card at the top of a certificate (Nov 2026). Replaces the
// single cramped line under the certificate number ("Requested … · Queue
// #…") with two parts:
//
//   1. A row of labelled facts: Status, Queue no., Requested / Released,
//      Payment — each with room to breathe instead of being run together
//      with middots.
//   2. A tracker for where the request is in the workflow:
//      Pending → Processing → Released, with the time each step happened.
//      A request made with "Process now" skips Pending, which shows here
//      as "Skipped — processed right away".
//
// Used by the full certificate page and the slide-over
// (CertificateDetailSheet) so both look the same.
"use client";

import { Check, X } from "lucide-react";
import {
  type CertificateMock,
  formatISODateTime,
  PAYMENT_STATUS_LABELS,
} from "@/lib/mock/certificates";

/** GET /api/certificates/[id] returns the whole row, including this. */
export type CertificateWithTiming = CertificateMock & {
  processing_started_at?: string | null;
};

const STATUS_TEXT: Record<string, { label: string; dot: string; text: string }> = {
  PENDING: { label: "Pending", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  PROCESSING: { label: "Processing", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
  RELEASED: { label: "Released", dot: "bg-green-600", text: "text-green-700 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
};

const PAYMENT_TEXT: Record<string, string> = {
  PENDING: "text-amber-700 dark:text-amber-400",
  PAID: "text-[#1F2937] dark:text-white",
  WAIVED: "text-[#1F2937] dark:text-white",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 py-3 pr-4 sm:px-5 sm:first:pl-0">
      <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">{label}</p>
      <div className="mt-1 text-[14px] font-medium text-[#1F2937] dark:text-white">{children}</div>
    </div>
  );
}

type StepState = "done" | "current" | "upcoming" | "skipped";

function Step({
  label,
  state,
  when,
  note,
  last,
}: {
  label: string;
  state: StepState;
  when?: string | null;
  note?: string;
  last?: boolean;
}) {
  const marker =
    state === "done" ? (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-(--brand) text-white">
        <Check size={12} strokeWidth={3} />
      </span>
    ) : state === "current" ? (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-(--brand) bg-white dark:bg-[#171717]">
        <span className="h-2 w-2 rounded-full bg-(--brand)" />
      </span>
    ) : (
      <span className="h-5 w-5 rounded-full border-2 border-dashed border-[#D1D5DB] dark:border-[#404040]" />
    );

  return (
    <li className="relative flex-1">
      {!last && (
        <span
          aria-hidden
          className={`absolute left-5 right-0 top-2.5 h-px ${
            state === "done" || state === "skipped" ? "bg-(--brand)" : "bg-[#E5E7EB] dark:bg-[#333333]"
          }`}
        />
      )}
      <div className="relative flex items-center">{marker}</div>
      <p
        className={`mt-2 text-[13px] ${
          state === "upcoming" || state === "skipped"
            ? "text-[#9CA3AF] dark:text-[#737373]"
            : "font-semibold text-[#1F2937] dark:text-white"
        }`}
      >
        {label}
      </p>
      <p className="mt-0.5 pr-3 text-[12px] leading-snug text-[#6B7280] dark:text-[#A3A3A3]">
        {note ?? when ?? (state === "upcoming" ? "Not yet" : "—")}
      </p>
    </li>
  );
}

export default function CertificateOverview({ certificate }: { certificate: CertificateWithTiming }) {
  const c = certificate;
  const status = STATUS_TEXT[c.status] ?? STATUS_TEXT.PENDING;
  const cancelled = c.status === "CANCELLED";

  // "Process now" requests start processing the moment they're saved, so
  // they never sat in Pending.
  const skippedPending =
    !!c.processing_started_at &&
    Math.abs(new Date(c.processing_started_at).getTime() - new Date(c.requested_at).getTime()) < 5000;

  const reachedProcessing = c.status === "PROCESSING" || c.status === "RELEASED" || !!c.processing_started_at;
  const released = c.status === "RELEASED";

  const pendingState: StepState = skippedPending ? "skipped" : c.status === "PENDING" ? "current" : "done";
  const processingState: StepState = released ? "done" : c.status === "PROCESSING" ? "current" : reachedProcessing ? "done" : "upcoming";
  const releasedState: StepState = released ? "done" : "upcoming";

  return (
    <section className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
      <div className="grid grid-cols-2 divide-[#F0F1F3] px-5 sm:grid-cols-4 sm:divide-x dark:divide-[#262626]">
        <Fact label="Status">
          <span className={`inline-flex items-center gap-2 ${status.text}`}>
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </Fact>
        <Fact label="Queue no.">
          <span className="font-mono text-[13.5px] tabular-nums">{c.queue_number}</span>
        </Fact>
        <Fact label={released ? "Released" : "Requested"}>
          <span className="tabular-nums">{formatISODateTime(released ? c.issued_at : c.requested_at)}</span>
        </Fact>
        <Fact label="Payment">
          <span className={PAYMENT_TEXT[c.payment_status] ?? ""}>{PAYMENT_STATUS_LABELS[c.payment_status]}</span>
        </Fact>
      </div>

      <div data-tour="page-certificates-detail-flow" className="border-t border-[#F0F1F3] dark:border-[#262626] px-5 pb-4 pt-4">
        {cancelled ? (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <X size={12} strokeWidth={3} />
            </span>
            <p className="text-[13px] leading-relaxed text-[#374151] dark:text-[#D4D4D4]">
              This request was cancelled before it was released. It can&apos;t be processed further. File a new
              request if the applicant still needs the document.
            </p>
          </div>
        ) : (
          <ol className="flex">
            <Step
              label="Pending"
              state={pendingState}
              when={formatISODateTime(c.requested_at)}
              note={skippedPending ? "Skipped, processed right away" : c.status === "PENDING" ? "Waiting in the Document Queue" : undefined}
            />
            <Step
              label="Processing"
              state={processingState}
              when={formatISODateTime(c.processing_started_at ?? null)}
              note={c.status === "PROCESSING" ? "Being prepared and printed" : undefined}
            />
            <Step
              label="Released"
              state={releasedState}
              when={formatISODateTime(c.issued_at)}
              note={!released ? "Not yet handed over" : undefined}
              last
            />
          </ol>
        )}
      </div>
    </section>
  );
}