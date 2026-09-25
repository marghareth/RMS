// FILE: src/components/layout/NavGroup.tsx
//
// REDESIGN: back to an expandable row inside the single-column sidebar
// (see Sidebar.tsx). The header renders as the same solid rounded-full
// "pill" as an active standalone NavItem whenever the current route is
// inside this module, with a chevron on the right that doubles as the
// expand/collapse control — matching the client's reference mockup,
// where the active "Threads" group is a filled dark pill with its
// children listed underneath it. A group the user isn't currently in
// stays a plain, unfilled row and can still be expanded manually to
// browse, it just doesn't wear the "you are here" pill.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NavItem from "./NavItem";

interface NavChild {
  label: string;
  href: string;
  addHref?: string;
  exact?: boolean;
  icon?: LucideIcon;
}

interface NavGroupProps {
  label: string;
  icon: LucideIcon;
  basePath: string;
  items: NavChild[];
  defaultOpen?: boolean;
}

export default function NavGroup({
  label,
  icon: Icon,
  basePath,
  items,
  defaultOpen = false,
}: NavGroupProps) {
  const pathname = usePathname();
  // Checked against every child's href, not just `basePath` — some groups
  // (e.g. Certificates/"Documents") contain children that live outside the
  // group's nominal basePath (Document Queue, Document Release), and a
  // single-prefix check would leave those children hidden/unhighlighted
  // when visited directly. Falls back to basePath too, in case a group's
  // landing page isn't itself listed as a child href.
  const hasActiveChild =
    pathname === basePath ||
    pathname.startsWith(basePath + "/") ||
    items.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
  const [open, setOpen] = useState(() => hasActiveChild || defaultOpen);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-[13px] transition-colors ${
          hasActiveChild
            ? "bg-[#1F2937] font-medium text-white dark:bg-white dark:text-[#111111]"
            : "font-normal text-[#4B5563] hover:bg-[#F4F5F7] hover:text-[#1F2937] dark:text-[#9CA3AF] dark:hover:bg-[#1F1F1F] dark:hover:text-white"
        }`}
      >
        <Icon
          size={16}
          strokeWidth={1.9}
          className={`shrink-0 ${
            hasActiveChild
              ? "text-white dark:text-[#111111]"
              : "text-[#9CA3AF] group-hover:text-[#374151] dark:group-hover:text-[#D1D5DB]"
          }`}
        />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform duration-200 ${
            hasActiveChild ? "text-white/80 dark:text-[#111111]/70" : "text-[#9CA3AF]"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 py-0.5">
            {items.map((child) => (
              <NavItem
                key={child.href}
                label={child.label}
                href={child.href}
                addHref={child.addHref}
                exact={child.exact}
                icon={child.icon}
                variant="child"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}