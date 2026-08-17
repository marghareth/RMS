import { LucideIcon } from "lucide-react";

// ALIGNED WITH DASHBOARD: this used to render a big colored icon-badge
// square (bg-blue-50/bg-amber-50/etc, per the `color` prop) — a visibly
// different card language from the Dashboard's own KPI cards
// (LedgerStatStrip in src/app/(dashboard)/dashboard/page.tsx), which use
// no icon at all: just a muted uppercase label, a small icon top-right,
// a big bold number, and a caption. That mismatch is what made every
// other page's "statcards" look inconsistent with the Dashboard.
//
// Rebuilt to mirror LedgerStatStrip's card exactly — same border/shadow
// treatment, same label/value/caption type scale and colors, same small
// top-right icon treatment instead of a colored square. `color` is kept
// in the props for backward compatibility with existing call sites
// (`color="blue"` etc. across Reports/Finance/Visitors/...) but no
// longer changes the card's appearance, since the Dashboard's cards
// don't color-code by metric either — every value renders in the same
// neutral "ink" color there.
interface StatCardProps {
  label: string;
  value: string | number;
  sub?:  string;
  icon:  LucideIcon;
  color?: "blue" | "amber" | "green" | "red" | "purple" | "teal";
}

export default function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#9CA3AF] dark:text-[#A3A3A3]">
          {label}
        </p>
        <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
      </div>
      <div>
        <p className="text-[28px] font-bold leading-none text-[#1B2430] dark:text-white tabular-nums">
          {value}
        </p>
        {sub && <p className="mt-1.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{sub}</p>}
      </div>
    </div>
  );
}