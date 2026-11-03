// FILE: src/components/admin/TemporaryPasswordDialog.tsx
//
// Shows a temporary password once, right after an Admin or Secretary
// issues it. It's never stored readable, so closing this dialog is the
// last time anyone sees it; issuing another replaces it.
"use client";

import { useState } from "react";

export interface IssuedPassword {
  username: string;
  temporaryPassword: string;
  expiresAt: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export default function TemporaryPasswordDialog({
  issued,
  onClose,
}: {
  issued: IssuedPassword | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!issued) return null;

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the password is selectable on screen.
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-sm rounded-xl border border-[#E9EAEC] bg-white p-5 shadow-lg dark:border-[#333333] dark:bg-[#171717]">
        <h3 className="text-[15px] font-semibold text-[#1F2937] dark:text-white">
          Temporary password for {issued.username}
        </h3>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-[#F4F5F7] px-4 py-3 dark:bg-[#111111]">
          <span className="select-all font-mono text-[17px] text-[#1F2937] dark:text-white">
            {issued.temporaryPassword}
          </span>
          <button
            onClick={copy}
            className="shrink-0 text-[12px] font-medium text-(--brand-fg) hover:text-(--brand-fg-strong)"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-[#4B5563] dark:text-[#A3A3A3]">
          Give it to them in person. It works until {formatTime(issued.expiresAt)}, and they&rsquo;ll set their
          own password when they sign in.
        </p>
        <p className="mt-2 text-[12px] text-[#9CA3AF] dark:text-[#737373]">
          You won&rsquo;t be able to see it again after closing this.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-medium text-white transition hover:bg-(--brand-hover)"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}