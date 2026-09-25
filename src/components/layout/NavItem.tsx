// FILE: src/components/layout/NavItem.tsx
//
// REDESIGN: the sidebar went back to a single scrolling column (see
// Sidebar.tsx), so this component grew a `variant` prop instead of being
// one fixed look:
//
//   - variant="top"   a standalone module link with no children (Home,
//                      Blotter, Calendar, ...). Renders as a full pill —
//                      rounded-full, solid dark fill — when active, so it
//                      reads exactly the same as an expanded NavGroup
//                      header. This is what the client's reference
//                      mockup shows for the current section.
//   - variant="child" a row inside an expanded NavGroup. Smaller, no
//                      pill — just a muted icon chip and (when active)
//                      bolder text, matching how the mockup distinguishes
//                      the selected sub-page from its siblings without
//                      repeating the pill treatment at every level.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  addHref?: string;
  addLabel?: string;
  exact?: boolean;
  variant?: "top" | "child";
}

export default function NavItem({
  label,
  href,
  icon: Icon,
  addHref,
  addLabel,
  exact = false,
  variant = "top",
}: NavItemProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  if (variant === "child") {
    const ChildIcon = Icon ?? FileText;
    return (
      <div className="group/item relative flex items-center">
        <Link
          href={href}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
            active
              ? "font-semibold text-[#1F2937] dark:text-white"
              : "font-normal text-[#6B7280] hover:text-[#1F2937] dark:text-[#9CA3AF] dark:hover:text-white"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
              active
                ? "bg-[#DCE9FF] text-[#3B82F6] dark:bg-[#14243F] dark:text-[#5B9BFA]"
                : "bg-[#F4F5F7] text-[#9CA3AF] dark:bg-[#1F1F1F] dark:text-[#6B7280]"
            }`}
          >
            <ChildIcon size={11} strokeWidth={2.1} />
          </span>
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

  return (
    <div className="group/item relative flex items-center">
      <Link
        href={href}
        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-3 py-2 text-[13px] transition-colors ${
          active
            ? "bg-[#1F2937] font-medium text-white dark:bg-white dark:text-[#111111]"
            : "font-normal text-[#4B5563] hover:bg-[#F4F5F7] hover:text-[#1F2937] dark:text-[#9CA3AF] dark:hover:bg-[#1F1F1F] dark:hover:text-white"
        }`}
      >
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.9}
            className={`shrink-0 ${active ? "text-white dark:text-[#111111]" : "text-[#9CA3AF]"}`}
          />
        )}
        <span className="truncate">{label}</span>
      </Link>

      {addHref && (
        <Link
          href={addHref}
          aria-label={addLabel ?? `Add ${label}`}
          className={`mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/item:opacity-100 ${
            active
              ? "text-white/70 hover:bg-white/15 hover:text-white dark:text-[#111111]/60 dark:hover:bg-black/10"
              : "text-[#9CA3AF] hover:bg-[#E9EAEC] hover:text-[#1F2937] dark:hover:bg-[#1F1F1F] dark:hover:text-white"
          }`}
        >
          <Plus size={12} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}