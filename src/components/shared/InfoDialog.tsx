// FILE: src/components/shared/InfoDialog.tsx
//
// One-button companion to ConfirmDialog (same file's sibling), for
// replacing native `alert(...)` calls — a plain message the user just
// acknowledges, as opposed to ConfirmDialog's two-button yes/no. Same
// visual language (icon badge, rounded card, variant colors) so the two
// never look like they came from different design systems, and — unlike
// the browser's built-in alert() — this one actually respects the app's
// dark mode instead of always rendering as a stark white OS dialog.
"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type InfoDialogVariant = "success" | "error" | "warning" | "info";

interface InfoDialogProps {
  open:         boolean;
  title:        string;
  message:      string;
  actionLabel?: string;
  onClose:      () => void;
  variant?:     InfoDialogVariant;
}

// ─── VARIANT CONFIG ───────────────────────────────────────────────────────────
const VARIANT: Record<InfoDialogVariant, {
  iconBg:    string;
  iconColor: string;
  btnBg:     string;
  btnHover:  string;
  Icon:      React.FC<{ size?: number; className?: string }>;
}> = {
  success: {
    iconBg:   "bg-green-50 dark:bg-green-500/15",
    iconColor:"text-green-500 dark:text-green-400",
    btnBg:    "bg-green-500 dark:bg-green-500",
    btnHover: "hover:bg-green-600",
    Icon:     CheckCircle2,
  },
  error: {
    iconBg:   "bg-red-50 dark:bg-red-500/15",
    iconColor:"text-red-500 dark:text-red-400",
    btnBg:    "bg-red-500 dark:bg-red-500",
    btnHover: "hover:bg-red-600",
    Icon:     XCircle,
  },
  warning: {
    iconBg:   "bg-amber-50 dark:bg-amber-500/15",
    iconColor:"text-amber-500 dark:text-amber-400",
    btnBg:    "bg-[#F59E0B]",
    btnHover: "hover:bg-[#D97706] dark:hover:bg-[#F59E0B]",
    Icon:     AlertTriangle,
  },
  info: {
    iconBg:   "bg-blue-50 dark:bg-blue-500/15",
    iconColor:"text-[#3B82F6] dark:text-[#60A5FA]",
    btnBg:    "bg-[#3B82F6]",
    btnHover: "hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]",
    Icon:     Info,
  },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function InfoDialog({
  open,
  title,
  message,
  actionLabel = "OK",
  onClose,
  variant = "info",
}: InfoDialogProps) {
  // Close on Escape key — mirrors ConfirmDialog's behavior.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cfg  = VARIANT[variant];
  const Icon = cfg.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] hover:text-[#6B7280] dark:hover:text-[#D4D4D4] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
        >
          <X size={15} />
        </button>

        {/* Body */}
        <div className="px-6 pt-6 pb-5">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${cfg.iconBg}`}>
            <Icon size={20} className={cfg.iconColor} />
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-black text-[#1F2937] dark:text-white uppercase tracking-wide mb-2">
            {title}
          </h3>

          {/* Message — whitespace-pre-line so \n-separated alert() messages
              (e.g. "Filed.\nA real save will redirect...") still break onto
              their own lines instead of collapsing into one run-on sentence. */}
          <p className="whitespace-pre-line text-[13px] text-[#6B7280] dark:text-[#A3A3A3] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition shadow-sm ${cfg.btnBg} ${cfg.btnHover}`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}