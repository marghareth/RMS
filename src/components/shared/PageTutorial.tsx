// FILE: src/components/shared/PageTutorial.tsx
//
// A "How to use this page" button that opens a short step-by-step guide in
// a popup. Content lives in src/lib/adminTutorials.ts (one entry per
// page) so wording can be edited without touching any page's layout.
// Normally rendered for you by <PageHeader tutorial={...} />; pages with a
// custom header (e.g. Add User / Edit User) render it directly.
"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Lightbulb, X } from "lucide-react";

export interface TutorialStep {
  title: string;
  description: string;
}

export interface TutorialContent {
  /** Heading of the popup, e.g. "How to manage users". */
  title: string;
  /** One or two sentences: what this page is for. */
  intro: string;
  steps: TutorialStep[];
  /** Optional short reminders / gotchas shown under the steps. */
  tips?: string[];
}

export default function PageTutorial({ tutorial }: { tutorial: TutorialContent }) {
  const [open, setOpen] = useState(false);

  // Close on Escape, same as ConfirmDialog.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[12px] font-bold text-[#6B7280] dark:text-[#A3A3A3] transition hover:border-[#3B82F6] hover:text-[#3B82F6] dark:hover:border-[#60A5FA] dark:hover:text-[#60A5FA] print:hidden"
      >
        <HelpCircle size={14} />
        How to use
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 print:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-tutorial-title"
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#171717] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close tutorial"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#6B7280] dark:hover:text-[#D4D4D4]"
            >
              <X size={15} />
            </button>

            <div className="overflow-y-auto px-6 pb-6 pt-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EBF3FF] dark:bg-blue-500/15">
                <HelpCircle size={20} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
              </div>
              <h3
                id="page-tutorial-title"
                className="mb-2 pr-8 text-[15px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white"
              >
                {tutorial.title}
              </h3>
              <p className="mb-5 text-[13px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">
                {tutorial.intro}
              </p>

              <ol className="space-y-4">
                {tutorial.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#1F2937] dark:text-white">{step.title}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {tutorial.tips && tutorial.tips.length > 0 && (
                <div className="mt-5 rounded-lg bg-[#FEF3C7] dark:bg-amber-500/10 px-4 py-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-[#D97706] dark:text-[#FBBF24]" />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#D97706] dark:text-[#FBBF24]">
                      Good to know
                    </p>
                  </div>
                  <ul className="list-disc space-y-1 pl-4">
                    {tutorial.tips.map((tip) => (
                      <li key={tip} className="text-[12px] leading-relaxed text-[#92400E] dark:text-[#FDE68A]">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t border-[#F4F5F7] dark:border-[#262626] px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-[#3B82F6] py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}