// FILE: src/components/shared/ExportMenu.tsx
//
// "Export" button with a choice of format (Nov 2026): Excel (every field)
// or PDF (the main fields, ready to print). Used on the Residents and
// Households pages. Closes on outside click or Escape.
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";

export type ExportFormat = "xlsx" | "pdf";

interface Props {
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
  disabled?: boolean;
  title?: string;
  /** One line under "Excel spreadsheet". */
  excelHint?: string;
  /** One line under "PDF". */
  pdfHint?: string;
  className?: string;
  dataTour?: string;
}

export default function ExportMenu({
  onExport,
  exporting,
  disabled,
  title,
  excelHint = "Every field, opens in Excel",
  pdfHint = "Main fields only, ready to print",
  className = "",
  dataTour,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(f: ExportFormat) {
    setOpen(false);
    onExport(f);
  }

  const item =
    "flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]";

  return (
    <div ref={ref} className="relative" data-tour={dataTour}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || exporting}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          className ||
          "flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-medium text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:opacity-50"
        }
      >
        <Download size={14} />
        {exporting ? "Exporting…" : "Export"}
        <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-60 rounded-lg border border-[#E9EAEC] bg-white p-1 shadow-lg dark:border-[#262626] dark:bg-[#171717]"
        >
          <button type="button" role="menuitem" onClick={() => pick("xlsx")} className={item}>
            <span className="text-[13px] font-medium text-[#1F2937] dark:text-white">Excel spreadsheet</span>
            <span className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{excelHint}</span>
          </button>
          <button type="button" role="menuitem" onClick={() => pick("pdf")} className={item}>
            <span className="text-[13px] font-medium text-[#1F2937] dark:text-white">PDF</span>
            <span className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{pdfHint}</span>
          </button>
        </div>
      )}
    </div>
  );
}