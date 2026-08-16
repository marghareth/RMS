import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?:  string;
  icon:  LucideIcon;
  color?: "blue" | "amber" | "green" | "red" | "purple" | "teal";
}

const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-500/15",   icon: "text-blue-500 dark:text-blue-400",   value: "text-blue-600 dark:text-blue-400"   },
  amber:  { bg: "bg-amber-50 dark:bg-amber-500/15",  icon: "text-amber-500 dark:text-amber-400",  value: "text-amber-600 dark:text-amber-400"  },
  green:  { bg: "bg-green-50 dark:bg-green-500/15",  icon: "text-green-500 dark:text-green-400",  value: "text-green-600 dark:text-green-400"  },
  red:    { bg: "bg-red-50 dark:bg-red-500/15",    icon: "text-red-500 dark:text-red-400",    value: "text-red-600 dark:text-red-400"    },
  purple: { bg: "bg-purple-50 dark:bg-purple-500/15", icon: "text-purple-500 dark:text-purple-400", value: "text-purple-600 dark:text-purple-400" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-500/15",   icon: "text-teal-500 dark:text-teal-400",   value: "text-teal-600 dark:text-teal-400"   },
};

export default function StatCard({ label, value, sub, icon: Icon, color = "blue" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3.5 flex items-center gap-3.5">
      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className={`text-[22px] font-bold leading-none ${c.value}`}>{value}</p>
        {sub && <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3] mt-1">{sub}</p>}
      </div>
    </div>
  );
}