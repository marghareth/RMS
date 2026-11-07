// FILE: src/app/(dashboard)/admin/page.tsx
//
// REDESIGN (Nov 2026): the four colored icon cards became one plain list,
// grouped into "People and access" and "Records and safety", and each row
// now says how things stand right now — how many accounts, password
// resets waiting, how many puroks, the latest recorded action, when the
// last backup ran — so this page answers "is anything waiting for me?"
// before you click into a section. Rows the signed-in role can't open
// aren't shown. Each status line is fetched on its own; one that can't
// load just shows the section's description instead.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { ADMIN_TUTORIALS } from "@/lib/adminTutorials";
import { useCan } from "@/lib/hooks/useCan";

type Tone = "normal" | "attention";
interface Status {
  text: string;
  tone: Tone;
}

interface Section {
  key: string;
  href: string;
  title: string;
  description: string;
  permission: string;
  /** Loads the one-line status shown on the right. */
  load?: () => Promise<Status | null>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const GROUPS: { title: string; sections: Section[] }[] = [
  {
    title: "People and access",
    sections: [
      {
        key: "users",
        href: "/admin/users",
        title: "Users",
        description: "Create accounts, assign roles, turn access on or off",
        permission: "users:read",
        load: async () => {
          const users = (await getJson("/api/users")) as { is_active: boolean }[];
          if (!Array.isArray(users)) return null;
          const off = users.filter((u) => !u.is_active).length;
          let resets = 0;
          try {
            const r = await getJson("/api/users/reset-requests");
            resets = Array.isArray(r) ? r.length : 0;
          } catch {
            // Roles that can only view users can't see reset requests.
          }
          if (resets > 0) {
            return { text: `${plural(resets, "password reset", "password resets")} waiting for approval`, tone: "attention" };
          }
          return {
            text: `${plural(users.length - off, "active account", "active accounts")}${off ? `, ${off} deactivated` : ""}`,
            tone: "normal",
          };
        },
      },
      {
        key: "puroks",
        href: "/admin/puroks",
        title: "Puroks",
        description: "The zones used for residents, households and reports",
        permission: "residents:read",
        load: async () => {
          const puroks = await getJson("/api/puroks");
          return Array.isArray(puroks) ? { text: plural(puroks.length, "purok", "puroks"), tone: "normal" } : null;
        },
      },
    ],
  },
  {
    title: "Records and safety",
    sections: [
      {
        key: "audit",
        href: "/admin/audit-logs",
        title: "Audit logs",
        description: "Every add, change and delete, with who did it and when",
        permission: "audit-logs:read",
        load: async () => {
          const data = (await getJson("/api/audit-logs?limit=1")) as {
            logs?: { performed_at: string; user?: { username: string } }[];
          };
          const last = data?.logs?.[0];
          return last
            ? { text: `Latest: ${fmtDateTime(last.performed_at)}${last.user ? ` by ${last.user.username}` : ""}`, tone: "normal" }
            : { text: "Nothing recorded yet", tone: "normal" };
        },
      },
      {
        key: "backup",
        href: "/admin/backup",
        title: "Backup",
        description: "Make a copy of the database and download past copies",
        permission: "backup:write",
        load: async () => {
          const backups = (await getJson("/api/backup")) as { backup_date: string }[];
          if (!Array.isArray(backups)) return null;
          if (backups.length === 0) return { text: "No backup made yet", tone: "attention" };
          const last = backups[0].backup_date;
          const days = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
          return {
            text: `Last backup ${fmtDate(last)}${days > 30 ? `, ${days} days ago` : ""}`,
            tone: days > 30 ? "attention" : "normal",
          };
        },
      },
      {
        key: "settings",
        href: "/admin/settings",
        title: "Settings",
        description: "Barangay details, logos, signatory and incident types",
        permission: "settings:read",
      },
    ],
  },
];

function SectionRow({ section }: { section: Section }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!section.load) return;
    let cancelled = false;
    section
      .load()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        // Leave the description on its own.
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  return (
    <li>
      <Link
        href={section.href}
        className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1F2937] dark:text-white">{section.title}</p>
          <p className="mt-0.5 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">{section.description}</p>
        </div>
        {status && (
          <p
            className={`hidden shrink-0 text-right text-[12.5px] sm:block ${
              status.tone === "attention" ? "font-medium text-amber-700 dark:text-amber-400" : "text-[#6B7280] dark:text-[#A3A3A3]"
            }`}
          >
            {status.text}
          </p>
        )}
        <ChevronRight size={16} className="shrink-0 text-[#C4C8CE] transition group-hover:text-[#6B7280] dark:text-[#525252] dark:group-hover:text-[#A3A3A3]" />
      </Link>
      {/* On narrow screens the status goes under the description instead. */}
      {status && (
        <p
          className={`-mt-2 px-5 pb-3 text-[12px] sm:hidden ${
            status.tone === "attention" ? "font-medium text-amber-700 dark:text-amber-400" : "text-[#6B7280] dark:text-[#A3A3A3]"
          }`}
        >
          {status.text}
        </p>
      )}
    </li>
  );
}

export default function AdminHubPage() {
  const can = useCan();

  return (
    <div className="max-w-4xl">
      <PageHeader title="Admin" subtitle="Accounts, zones, activity records and backups" tutorial={ADMIN_TUTORIALS.hub} />

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const visible = group.sections.filter((s) => can(s.permission));
          if (visible.length === 0) return null;
          return (
            <section key={group.title}>
              <h2 className="mb-2 text-[13px] font-semibold text-[#374151] dark:text-[#D4D4D4]">{group.title}</h2>
              <ul className="divide-y divide-[#F0F1F3] overflow-hidden rounded-xl border border-[#E9EAEC] bg-white dark:divide-[#262626] dark:border-[#262626] dark:bg-[#171717]">
                {visible.map((s) => (
                  <SectionRow key={s.key} section={s} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}