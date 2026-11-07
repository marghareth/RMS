// FILE: src/components/shared/StatusBadge.tsx
//
// REDESIGN (Nov 2026): a small colored dot followed by the status in
// plain text. The previous version — rounded pill + tinted fill + colored
// border + an icon per tone — read as generic generated UI and, in dark
// mode, glowed against the background. The color now lives only in the
// dot and the text, which is enough to scan a list and keeps rows calm.
// Same visual language as the status in CertificateOverview.
//
// Every status key from before is kept (so no call site breaks), grouped
// onto one of 7 tones. Aliases for SUBMITTED, IN_PROGRESS, IN_REVIEW,
// SUCCESS, FAILED, EXPIRED and REJECTED stay too, in case any API route
// returns those exact strings.

type Status = string;

type Tone = "amber" | "blue" | "violet" | "orange" | "green" | "red" | "gray";

// Text color per tone, light then dark. 700 / 400 keep contrast readable
// on white and on the near-black dark-mode surfaces.
const TONE_TEXT: Record<Tone, string> = {
  amber:  "text-amber-700 dark:text-amber-400",
  blue:   "text-blue-700 dark:text-blue-400",
  violet: "text-violet-700 dark:text-violet-400",
  orange: "text-orange-700 dark:text-orange-400",
  green:  "text-green-700 dark:text-green-400",
  red:    "text-red-700 dark:text-red-400",
  gray:   "text-[#4B5563] dark:text-[#A3A3A3]",
};

const TONE_DOT: Record<Tone, string> = {
  amber:  "bg-amber-500",
  blue:   "bg-blue-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  green:  "bg-green-600 dark:bg-green-500",
  red:    "bg-red-500",
  gray:   "bg-[#9CA3AF] dark:bg-[#737373]",
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
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium leading-5 ${TONE_TEXT[s.tone]}`}>
      <span aria-hidden className={`h-1.75 w-1.75 shrink-0 rounded-full ${TONE_DOT[s.tone]}`} />
      {s.label}
    </span>
  );
}