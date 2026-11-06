// FILE: src/components/shared/RequestSummaryDialog.tsx
//
// The two summary screens every request goes through (Nov 2026):
//
//   1. "Review request" (mode="review"), before anything is saved: every
//      detail entered, with Edit (go back) or Confirm.
//   2. "Request filed" (mode="done"), after saving: the reference number
//      and the same details, with Print slip (a small PDF the requester can
//      take home) and the page's next step.
//
// Used by certificate requests, Barangay ID issuance, blotter filing and
// equipment borrowing.
"use client";

import { useEffect } from "react";
import { CheckCircle2, Printer } from "lucide-react";

export interface SummaryRow {
  label: string;
  value: string | null | undefined;
}

interface Props {
  open: boolean;
  mode: "review" | "done";
  /** e.g. "Barangay Clearance request" */
  title: string;
  rows: SummaryRow[];
  /** Shown big on the "done" screen, e.g. { label: "Queue No.", value: "Q-2026-0214" }. */
  reference?: SummaryRow;
  /** A line under the details, e.g. what happens next. */
  note?: string;
  error?: string;
  busy?: boolean;
  /** review: go back and change something */
  onEdit?: () => void;
  /** review: save it */
  onConfirm?: () => void;
  confirmLabel?: string;
  /** done: the printable slip (opens in a new tab) */
  slipHref?: string;
  /** done: the main next step, e.g. "View request" */
  onDone?: () => void;
  doneLabel?: string;
  /** done: a second action, e.g. "File another" */
  onAnother?: () => void;
  anotherLabel?: string;
}

export default function RequestSummaryDialog({
  open,
  mode,
  title,
  rows,
  reference,
  note,
  error,
  busy,
  onEdit,
  onConfirm,
  confirmLabel = "Confirm and submit",
  slipHref,
  onDone,
  doneLabel = "Done",
  onAnother,
  anotherLabel = "File another",
}: Props) {
  useEffect(() => {
    if (!open || mode !== "review") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onEdit?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, mode, busy, onEdit]);

  if (!open) return null;
  const shown = rows.filter((r) => r.value != null && String(r.value).trim() !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={() => mode === "review" && !busy && onEdit?.()} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white shadow-lg dark:border-[#333333] dark:bg-[#171717]">
        <div className="border-b border-[#E9EAEC] px-5 py-4 dark:border-[#333333]">
          {mode === "done" ? (
            <p className="flex items-center gap-2 text-[15px] font-semibold text-[#047857] dark:text-[#34D399]">
              <CheckCircle2 size={17} /> Request filed
            </p>
          ) : (
            <p className="text-[15px] font-semibold text-[#1F2937] dark:text-white">Review before submitting</p>
          )}
          <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{title}</p>
        </div>

        {mode === "done" && reference?.value && (
          <div className="border-b border-[#E9EAEC] bg-[#F9FAFB] px-5 py-4 text-center dark:border-[#333333] dark:bg-[#111111]">
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">{reference.label}</p>
            <p className="mt-0.5 font-mono text-[24px] font-bold text-[#1F2937] dark:text-white">{reference.value}</p>
          </div>
        )}

        <dl className="divide-y divide-[#F4F5F7] px-5 dark:divide-[#262626]">
          {shown.map((r) => (
            <div key={r.label} className="flex gap-4 py-2.5">
              <dt className="w-32 shrink-0 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{r.label}</dt>
              <dd className="min-w-0 flex-1 text-[13px] text-[#1F2937] dark:text-white">{r.value}</dd>
            </div>
          ))}
        </dl>

        {(note || error) && (
          <div className="px-5 pb-1">
            {note && <p className="text-[12px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">{note}</p>}
            {error && <p className="mt-2 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
          {mode === "review" ? (
            <>
              <button
                onClick={onEdit}
                disabled={busy}
                className="rounded-lg border border-[#E9EAEC] px-4 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F4F5F7] disabled:opacity-50 dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
              >
                Edit
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-medium text-white transition hover:bg-(--brand-hover) disabled:opacity-60"
              >
                {busy ? "Saving…" : confirmLabel}
              </button>
            </>
          ) : (
            <>
              {onAnother && (
                <button
                  onClick={onAnother}
                  className="mr-auto text-[13px] text-[#6B7280] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white"
                >
                  {anotherLabel}
                </button>
              )}
              {slipHref && (
                <a
                  href={slipHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-4 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
                >
                  <Printer size={14} /> Print slip
                </a>
              )}
              <button
                onClick={onDone}
                className="rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-medium text-white transition hover:bg-(--brand-hover)"
              >
                {doneLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}