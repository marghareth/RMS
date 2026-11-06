// FILE: src/components/residents/PrintProfileDialog.tsx
//
// "Print profile" on a resident's page (Nov 2026): tick the sections to
// include, then open the PDF (GET /api/pdf/resident/[id]) in a new tab to
// print or save. Sections the user's role can't see aren't offered. The
// last choice is remembered on this computer.
"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { PROFILE_SECTIONS, type ProfileSectionKey } from "@/lib/resident-profile-sections";

const STORE = "rms:profile-sections";

function initialChoice(available: ProfileSectionKey[]): Set<ProfileSectionKey> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (Array.isArray(saved)) {
      const keep = saved.filter((k): k is ProfileSectionKey => available.includes(k));
      if (keep.length) return new Set(keep);
    }
  } catch {
    // no saved choice; use the defaults
  }
  return new Set(PROFILE_SECTIONS.filter((x) => x.defaultOn && available.includes(x.key)).map((x) => x.key));
}

export default function PrintProfileDialog({
  residentId,
  residentName,
  open,
  onClose,
  can,
}: {
  residentId: number;
  residentName: string;
  open: boolean;
  onClose: () => void;
  can: (permission: string) => boolean;
}) {
  const available = PROFILE_SECTIONS.filter((x) => can(x.permission));
  const [chosen, setChosen] = useState<Set<ProfileSectionKey> | null>(null);
  const picked = chosen ?? initialChoice(available.map((x) => x.key));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggle(key: ProfileSectionKey) {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen(next);
  }

  // Keep the standard order whatever order they were ticked in.
  const keys = available.map((x) => x.key).filter((k) => picked.has(k));
  const href = `/api/pdf/resident/${residentId}?sections=${keys.join(",")}`;

  function openPdf() {
    try {
      localStorage.setItem(STORE, JSON.stringify(keys));
    } catch {
      // storage blocked; the choice just isn't remembered
    }
    window.open(href, "_blank", "noopener");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Print profile">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-[#E9EAEC] bg-white shadow-lg dark:border-[#333333] dark:bg-[#171717]">
        <div className="flex items-start justify-between border-b border-[#E9EAEC] px-5 py-4 dark:border-[#333333]">
          <div>
            <p className="text-[15px] font-semibold text-[#1F2937] dark:text-white">Print profile</p>
            <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{residentName}. Choose what to include.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-[#9CA3AF] hover:bg-[#F4F5F7] hover:text-[#1F2937] dark:hover:bg-[#1F1F1F] dark:hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="divide-y divide-[#F4F5F7] px-5 dark:divide-[#262626]">
          {available.map((sec) => (
            <label key={sec.key} className="flex cursor-pointer items-start gap-3 py-3">
              <input
                type="checkbox"
                checked={picked.has(sec.key)}
                onChange={() => toggle(sec.key)}
                className="mt-0.5 h-4 w-4 accent-(--brand)"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#1F2937] dark:text-white">{sec.label}</span>
                <span className="block text-[11.5px] text-[#6B7280] dark:text-[#A3A3A3]">{sec.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="px-5 pt-1 text-[11.5px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">
          The printout contains personal information. Each print is recorded in the audit log.
        </p>

        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="flex gap-3 text-[12px]">
            <button onClick={() => setChosen(new Set(available.map((x) => x.key)))} className="text-(--brand-fg) hover:text-(--brand-fg-strong)">
              Select all
            </button>
            <button onClick={() => setChosen(new Set())} className="text-[#6B7280] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white">
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#E9EAEC] px-4 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
            >
              Cancel
            </button>
            <button
              onClick={openPdf}
              disabled={keys.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-medium text-white transition hover:bg-(--brand-hover) disabled:opacity-50"
            >
              <Printer size={14} /> Open printable PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}