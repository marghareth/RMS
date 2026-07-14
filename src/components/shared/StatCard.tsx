import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?:  string;
  icon:  LucideIcon;
  color?: "blue" | "amber" | "green" | "red" | "purple" | "teal";
}

const colorMap = {
  blue:   { bg: "bg-blue-50",   icon: "text-blue-500",   value: "text-blue-600"   },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-500",  value: "text-amber-600"  },
  green:  { bg: "bg-green-50",  icon: "text-green-500",  value: "text-green-600"  },
  red:    { bg: "bg-red-50",    icon: "text-red-500",    value: "text-red-600"    },
  purple: { bg: "bg-purple-50", icon: "text-purple-500", value: "text-purple-600" },
  teal:   { bg: "bg-teal-50",   icon: "text-teal-500",   value: "text-teal-600"   },
};

export default function StatCard({ label, value, sub, icon: Icon, color = "blue" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3.5 flex items-center gap-3.5">
      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className={`text-[22px] font-bold leading-none ${c.value}`}>{value}</p>
        {sub && <p className="text-[11px] text-[#9CA3AF] mt-1">{sub}</p>}
      </div>
    </div>
  );
}