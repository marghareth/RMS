"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2, Archive, X, CheckCircle2, Info } from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type DialogVariant = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  open:          boolean;
  title:         string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  onConfirm:     () => void;
  onCancel:      () => void;
  variant?:      DialogVariant;
  loading?:      boolean;
}

// ─── VARIANT CONFIG ───────────────────────────────────────────────────────────
const VARIANT: Record<DialogVariant, {
  iconBg:    string;
  iconColor: string;
  btnBg:     string;
  btnHover:  string;
  Icon:      React.FC<{ size?: number; className?: string }>;
}> = {
  danger: {
    iconBg:   "bg-red-50",
    iconColor:"text-red-500",
    btnBg:    "bg-red-500",
    btnHover: "hover:bg-red-600",
    Icon:     Trash2,
  },
  warning: {
    iconBg:   "bg-amber-50",
    iconColor:"text-amber-500",
    btnBg:    "bg-[#F59E0B]",
    btnHover: "hover:bg-[#D97706]",
    Icon:     AlertTriangle,
  },
  info: {
    iconBg:   "bg-blue-50",
    iconColor:"text-[#3B82F6]",
    btnBg:    "bg-[#3B82F6]",
    btnHover: "hover:bg-[#2563EB]",
    Icon:     Info,
  },
  success: {
    iconBg:   "bg-green-50",
    iconColor:"text-green-500",
    btnBg:    "bg-green-500",
    btnHover: "hover:bg-green-600",
    Icon:     CheckCircle2,
  },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  onConfirm,
  onCancel,
  variant  = "danger",
  loading  = false,
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const cfg  = VARIANT[variant];
  const Icon = cfg.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F4F5F7] transition"
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
          <h3 className="text-[15px] font-black text-[#1F2937] uppercase tracking-wide mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-[13px] text-[#6B7280] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] disabled:opacity-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 transition shadow-sm
              ${cfg.btnBg} ${cfg.btnHover}`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}