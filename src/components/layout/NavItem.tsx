// FILE: src/components/layout/NavItem.tsx
// Renders one row inside the contextual RAIL (the 212px panel beside the
// spine — see Sidebar.tsx). Previously this doubled as both the top-level
// and indented-accordion-child row for the old single-column sidebar;
// the accordion is gone now; every rail row is one flat list, so this
// component lost its `indent` variant and the child-of-a-group left rule.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  addHref?: string;
  addLabel?: string;
  exact?: boolean;
}

export default function NavItem({
  label,
  href,
  icon: Icon,
  addHref,
  addLabel,
  exact = false,
}: NavItemProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="group/item relative flex items-center">
      <Link
        href={href}
        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded px-2 py-1.75 text-[13px] transition-colors ${
          active
            ? "bg-[#EBF3FF] font-semibold text-[#3B82F6] dark:bg-[#14243F] dark:text-[#5B9BFA]"
            : "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#1F2937] dark:text-[#9CA3AF] dark:hover:bg-[#1F1F1F] dark:hover:text-white"
        }`}
      >
        {Icon && (
          <Icon
            size={15}
            strokeWidth={1.75}
            className={`shrink-0 ${
              active ? "text-[#3B82F6] dark:text-[#5B9BFA]" : "text-[#9CA3AF]"
            }`}
          />
        )}
        <span className="truncate">{label}</span>
      </Link>

      {addHref && (
        <Link
          href={addHref}
          aria-label={addLabel ?? `Add ${label}`}
          className="mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 text-[#9CA3AF] transition-opacity hover:bg-[#E9EAEC] hover:text-[#1F2937] group-hover/item:opacity-100 dark:hover:bg-[#1F1F1F] dark:hover:text-white"
        >
          <Plus size={12} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}