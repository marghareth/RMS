// FILE: src/components/shared/ListUI.tsx
//
// The list-page look from the Users page (Nov 2026), shared so every list
// page in the app matches it:
//
//   ┌ ListCard ─────────────────────────────────────────────────────┐
//   │ ListToolbar: All 31 · Filed 4 · Ongoing 3 …      [search…]    │
//   │───────────────────────────────────────────────────────────────│
//   │ Header cells in plain sentence case (TH)                      │
//   │ Rows (TR) …                                    Edit  Remove   │
//   └───────────────────────────────────────────────────────────────┘
//
// - ListTabs: status filter tabs with counts, underlined when selected.
//   Used instead of a row of stat cards when the cards were just counts
//   of the list's own statuses.
// - ListSummary: one quiet line of figures for the page subtitle
//   ("214 households · 4.2 members on average · 3 without a head"),
//   used instead of stat cards for totals that aren't statuses.
// - TextAction: the quiet row action ("Edit", "Deactivate") in place of
//   bordered ALL-CAPS buttons.
// - DateRangeFilter: the small "From / To" popover next to the search.
// - TH / TR / THEAD_ROW: class strings for plain tables.
"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

export const LIST_CARD =
  "overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717]";
export const THEAD_ROW = "border-b border-[#F0F1F3] dark:border-[#262626]";
export const TH = "px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]";
export const TH_RIGHT = `${TH} text-right`;
export const TR = "border-b border-[#F4F5F7] dark:border-[#262626] last:border-b-0";
export const TR_HOVER = `${TR} transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]`;
/** For lists built from grid rows rather than <table>: the header row. */
export const GRID_HEAD = "border-b border-[#F0F1F3] dark:border-[#262626]";
export const GRID_HEAD_CELL = "text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]";

export function ListCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${LIST_CARD} ${className}`}>{children}</div>;
}

export interface ListTab<K extends string = string> {
  key: K;
  label: string;
  count?: number;
}

export function ListTabs<K extends string>({
  tabs,
  value,
  onChange,
  label = "Filter the list",
}: {
  tabs: ListTab<K>[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-x-5">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`-mb-px border-b-2 pb-2.5 text-[13px] transition ${
              active
                ? "border-(--brand) font-semibold text-[#1F2937] dark:text-white"
                : "border-transparent text-[#6B7280] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 tabular-nums text-[#9CA3AF] dark:text-[#737373]">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ListSearch({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full sm:w-64 ${className}`}>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#737373]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] py-2 pl-8 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-(--brand-line)"
      />
    </div>
  );
}

/** The strip at the top of a ListCard: tabs on the left, search and filters on the right. */
export function ListToolbar({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E9EAEC] dark:border-[#333333] px-4 pt-3">
      <div className="min-h-9">{left}</div>
      <div className="mb-2.5 flex w-full flex-wrap items-center gap-2 sm:w-auto">{right}</div>
    </div>
  );
}

/** One quiet line of figures, for the page subtitle. Empty items are skipped. */
export function ListSummary({ items }: { items: (string | false | null | undefined)[] }) {
  const shown = items.filter(Boolean) as string[];
  return (
    <>
      {shown.map((t, i) => (
        <span key={t}>
          {i > 0 && <span aria-hidden className="mx-1.5 text-[#D1D5DB] dark:text-[#525252]">·</span>}
          {t}
        </span>
      ))}
    </>
  );
}

type Tone = "default" | "danger" | "success" | "muted";
const TONE: Record<Tone, string> = {
  default: "text-(--brand-fg) hover:bg-(--brand-tint)",
  danger:
    "text-[#6B7280] hover:bg-red-50 hover:text-red-700 dark:text-[#A3A3A3] dark:hover:bg-red-500/10 dark:hover:text-red-400",
  success: "text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10",
  muted: "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F] dark:hover:text-white",
};

/** A quiet row action. "danger" only turns red on hover, so a list of rows doesn't shout. */
export function TextAction({
  children,
  onClick,
  tone = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  tone?: Tone;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition disabled:opacity-50 ${TONE[tone]}`}
    >
      {children}
    </button>
  );
}

/** A filter button that opens a small From / To date popover. */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label = "Date",
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** What the dates refer to, e.g. "Incident date" or "Time in". */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = (from ? 1 : 0) + (to ? 1 : 0);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Filter by ${label.toLowerCase()}`}
        title={`Filter by ${label.toLowerCase()}`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          open || active
            ? "border-(--brand-line) bg-(--brand-tint) text-(--brand-fg)"
            : "border-[#E9EAEC] text-[#6B7280] hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
        }`}
      >
        <SlidersHorizontal size={15} />
        {active > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--brand) text-[9px] font-bold text-white">
            {active}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 space-y-3 rounded-xl border border-[#E9EAEC] bg-white p-4 shadow-lg dark:border-[#333333] dark:bg-[#171717]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#1F2937] dark:text-white">{label}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              <X size={14} className="text-[#9CA3AF]" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                {k === "from" ? "From" : "To"}
                <input
                  type="date"
                  value={k === "from" ? from : to}
                  onChange={(e) => onChange({ from, to, [k]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] text-[#1F2937] outline-none focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ from: "", to: "" })}
              className="flex-1 rounded-lg border border-[#E9EAEC] py-2 text-[12.5px] text-[#6B7280] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg bg-(--brand) py-2 text-[12.5px] font-semibold text-white transition hover:bg-(--brand-hover)"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}