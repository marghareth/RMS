// FILE: src/components/onboarding/BeginnerPromptModal.tsx
//
// Small centered dialog asking a first-time user whether they want the
// guided tour before it just launches on top of them. Whichever button
// they click, OnboardingProvider records the answer (localStorage, keyed
// per username) so this never shows again for that account — see
// answerYes()/answerNo() in OnboardingProvider.tsx. Only the automatic
// appearance of *this* prompt is controlled by the admin-level "Guided
// Tour" setting; the "?" icon in Topbar can always start the tour manually
// regardless of how this was answered.
"use client";

import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { useOnboarding } from "./OnboardingProvider";
import { useIsClient } from "@/lib/hooks/useIsClient";

export default function BeginnerPromptModal() {
  const { promptOpen, answerYes, answerNo } = useOnboarding();
  const isClient = useIsClient();

  if (!isClient || !promptOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="New here?">
      <div className="w-full max-w-sm rounded-xl border border-[#E9EAEC] bg-white p-6 text-center shadow-2xl dark:border-[#333333] dark:bg-[#171717]">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F3EE] dark:bg-[#11321F]">
          <Sparkles size={20} className="text-[#0B6E4F] dark:text-[#34A37A]" />
        </div>

        <h2 className="mt-4 text-[16px] font-bold text-[#1B2430] dark:text-white">First time here?</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563] dark:text-[#D4D4D4]">
          Want a quick, minute-long walkthrough of where everything is? You can always replay it later from the
          <span className="mx-1 inline-block rounded border border-[#E9EAEC] px-1.5 py-0.5 text-[11px] font-semibold dark:border-[#333333]">?</span>
          icon at the top of the screen.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={answerYes}
            className="w-full rounded-lg bg-[#0B6E4F] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#0A5C42] dark:bg-[#34A37A] dark:text-[#0A0A0A] dark:hover:bg-[#2E9169]"
          >
            Yes, show me around
          </button>
          <button
            type="button"
            onClick={answerNo}
            className="w-full rounded-lg border border-[#E9EAEC] px-4 py-2.5 text-[13px] font-semibold text-[#374151] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
          >
            No thanks, I know my way
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}