"use client";

import { useRouter } from "next/navigation";
import { Users, History, DatabaseBackup, ChevronRight } from "lucide-react";
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
  blue: { bg: "bg-[#EBF3FF]", text: "text-[#1D4ED8]" },
  amber: { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
  green: { bg: "bg-[#D1FAE5]", text: "text-[#059669]" },
};

export default function AdminHubPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader title="Admin" subtitle="System administration and configuration" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SECTIONS.map((s) => {
          const colors = COLOR_MAP[s.color];
          return (
            <button
              key={s.href}
              onClick={() => router.push(s.href)}
              className="flex items-center gap-4 rounded-xl border border-[#E9EAEC] bg-white p-5 text-left transition hover:border-[#3B82F6] hover:shadow-sm"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                <s.icon size={20} className={colors.text} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#1F2937]">{s.title}</p>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{s.description}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[#D1D5DB]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}