import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: "blue" | "amber" | "green" | "red";
}

const colorMap = {
  blue:  { bg: "bg-blue-50",  icon: "text-blue-500",  value: "text-blue-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-500", value: "text-amber-600" },
  green: { bg: "bg-green-50", icon: "text-green-500", value: "text-green-600" },
  red:   { bg: "bg-red-50",   icon: "text-red-500",   value: "text-red-600" },
};

export default function StatCard({ label, value, sub, icon: Icon, color = "blue" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={22} className={c.icon} />
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
        <div className={`text-2xl font-bold ${c.value} leading-none mb-0.5`}>{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}