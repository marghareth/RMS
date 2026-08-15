import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?:  string;
  icon:  LucideIcon;
  color?: "blue" | "amber" | "green" | "red" | "purple" | "teal";
}

// Muted "civic ledger" hues — same family used on the Dashboard (seal
// green / slate blue / brick red / amber). These color the icon only,
// as a light semantic cue; the card chrome and the value itself stay a
// consistent ink-on-white regardless of color, so every stat card across
// every page in the app reads the same way.
const colorMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  blue:   "text-[#3E5C76]",
  amber:  "text-[#B45309]",
  green:  "text-[#0B6E4F]",
  red:    "text-[#B3261E]",
  purple: "text-[#6D4AFF]",
  teal:   "text-[#0E7490]",
};

export default function StatCard({ label, value, sub, icon: Icon, color = "blue" }: StatCardProps) {
  const iconColor = colorMap[color] ?? colorMap.blue;
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-[#E9EAEC] bg-white px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F5F7]">
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest leading-none text-[#9CA3AF]">
          {label}
        </p>
        <p className="text-[22px] font-bold leading-none text-[#1B2430] tabular-nums">
          {value}
        </p>
        {sub && <p className="mt-1 text-[11px] text-[#9CA3AF]">{sub}</p>}
      </div>
    </div>
  );
}