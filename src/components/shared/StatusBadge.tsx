// FILE: src/components/shared/StatusBadge.tsx
//
// REDESIGN: matches the icon + soft-pill + subtle-border badge style
// (Pending/In progress/Submitted/In review/Success/Failed/Expired) —
// every existing status key from the old version is kept (so no call
// site anywhere breaks), just regrouped onto one of 6 semantic color+
// icon treatments instead of each key improvising its own bg/text pair.
// Aliases for the literal words from the reference (SUBMITTED,
// IN_PROGRESS, IN_REVIEW, SUCCESS, FAILED, EXPIRED, REJECTED) are added
// too, in case any API route ever returns those exact strings.
import {
  AlertTriangle, CircleDashed, Send, RotateCw,
  CheckCircle2, XCircle, Clock, type LucideIcon,
} from "lucide-react";

type Status = string;

type Tone = "amber" | "blue" | "violet" | "orange" | "green" | "red" | "gray";

const TONE_CLASSES: Record<Tone, string> = {
  amber:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25",
  blue:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/25",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/25",
  orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/25",
  green:  "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/25",
  red:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/25",
  gray:   "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-[#A3A3A3] dark:border-white/10",
};

const TONE_ICON: Record<Tone, LucideIcon> = {
  amber:  AlertTriangle,
  blue:   CircleDashed,
  violet: Send,
  orange: RotateCw,
  green:  CheckCircle2,
  red:    XCircle,
  gray:   Clock,
};

const statusMap: Record<string, { label: string; tone: Tone }> = {
  // ── amber / pending-like ──
  PENDING:       { label: "Pending",       tone: "amber" },

  // ── blue / in-progress-like ──
  PROCESSING:    { label: "Processing",    tone: "blue" },
  ONGOING:       { label: "Ongoing",       tone: "blue" },
  IN_PROGRESS:   { label: "In Progress",   tone: "blue" },
  ACTIVE:        { label: "Active",        tone: "blue" },

  // ── violet / submitted-like ──
  FILED:         { label: "Filed",         tone: "violet" },
  SUBMITTED:     { label: "Submitted",     tone: "violet" },

  // ── orange / in-review-like ──
  DISCUSSED:     { label: "Discussed",     tone: "orange" },
  SCHEDULED:     { label: "Scheduled",     tone: "orange" },
  IN_REVIEW:     { label: "In Review",     tone: "orange" },
  UNSERVICEABLE: { label: "Unserviceable", tone: "orange" },

  // ── green / success-like ──
  RESOLVED:      { label: "Resolved",      tone: "green" },
  SERVICEABLE:   { label: "Serviceable",   tone: "green" },
  INCOME:        { label: "Income",        tone: "green" },
  COMPLETED:     { label: "Completed",     tone: "green" },
  APPROVED:      { label: "Approved",      tone: "green" },
  RELEASED:      { label: "Released",      tone: "green" },
  SUCCESS:       { label: "Success",       tone: "green" },

  // ── red / failed-like ──
  ESCALATED:     { label: "Escalated",     tone: "red" },
  MISSING:       { label: "Missing",       tone: "red" },
  EXPENSE:       { label: "Expense",       tone: "red" },
  CANCELLED:     { label: "Cancelled",     tone: "red" },
  FAILED:        { label: "Failed",        tone: "red" },
  REJECTED:      { label: "Rejected",      tone: "red" },

  // ── gray / expired-like ──
  DISMISSED:     { label: "Dismissed",     tone: "gray" },
  INACTIVE:      { label: "Inactive",      tone: "gray" },
  ARCHIVED:      { label: "Archived",      tone: "gray" },
  CHECKED_OUT:   { label: "Checked Out",   tone: "gray" },
  EXPIRED:       { label: "Expired",       tone: "gray" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const s = statusMap[status] ?? { label: status, tone: "gray" as Tone };
  const Icon = TONE_ICON[s.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[s.tone]}`}
    >
      <Icon size={12} strokeWidth={2.25} />
      {s.label}
    </span>
  );
}