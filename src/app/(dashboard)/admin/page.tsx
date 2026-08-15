// FILE: src/app/(dashboard)/admin/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Users, History, DatabaseBackup, ChevronRight, MapPin } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

const SECTIONS = [
  {
    href: "/admin/users",
    icon: Users,
    title: "User Management",
    description: "Create accounts, assign roles, and manage access.",
    color: "blue" as const,
  },
  {
    href: "/admin/puroks",
    icon: MapPin,
    title: "Puroks",
    description: "Add, rename, or remove the puroks/zones used across the system.",
    color: "purple" as const,
  },
  {
    href: "/admin/audit-logs",
    icon: History,
    title: "Audit Logs",
    description: "Review every action taken across the system.",
    color: "amber" as const,
  },
  {
    href: "/admin/backup",
    icon: DatabaseBackup,
    title: "Backup",
    description: "Trigger a manual backup and view backup history.",
    color: "green" as const,
  },
];

const COLOR_MAP = {
  blue: { bg: "bg-[#EBF3FF] dark:bg-blue-500/15", text: "text-[#1D4ED8] dark:text-[#93C5FD]" },
  amber: { bg: "bg-[#FEF3C7] dark:bg-amber-500/15", text: "text-[#D97706] dark:text-[#FBBF24]" },
  green: { bg: "bg-[#D1FAE5] dark:bg-emerald-500/15", text: "text-[#059669] dark:text-[#34D399]" },
  purple: { bg: "bg-[#F3E8FF] dark:bg-violet-500/15", text: "text-[#7C3AED] dark:text-[#A78BFA]" },
};

export default function AdminHubPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader title="Admin" subtitle="System administration and configuration" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => {
          const colors = COLOR_MAP[s.color];
          return (
            <button
              key={s.href}
              onClick={() => router.push(s.href)}
              className="flex items-center gap-4 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 text-left transition hover:border-[#3B82F6] dark:hover:border-[#60A5FA] hover:shadow-sm"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                <s.icon size={20} className={colors.text} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#1F2937] dark:text-white">{s.title}</p>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{s.description}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[#D1D5DB] dark:text-[#525252]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}