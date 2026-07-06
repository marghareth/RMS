"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NavItem from "./NavItem";

interface NavChild {
  label:    string;
  href:     string;
  addHref?: string;
  exact?:   boolean;
}

interface NavGroupProps {
  label:        string;
  icon:         LucideIcon;
  basePath:     string;
  items:        NavChild[];
  defaultOpen?: boolean;
}

export default function NavGroup({
  label,
  icon: Icon,
  basePath,
  items,
  defaultOpen = false,
}: NavGroupProps) {
  const pathname       = usePathname();
  const hasActiveChild = pathname === basePath || pathname.startsWith(basePath + "/");
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
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
          hasActiveChild
            ? "bg-[#EBF3FF] text-[#1D4ED8]"
            : "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#1F2937]"
        }`}
      >
        <Icon
          size={18}
          strokeWidth={hasActiveChild ? 2.25 : 2}
          className={`shrink-0 ${
            hasActiveChild ? "text-[#1D4ED8]" : "text-[#9CA3AF] group-hover:text-[#374151]"
          }`}
        />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          size={15}
          strokeWidth={2.25}
          className={`shrink-0 transition-transform duration-200 ${
            hasActiveChild ? "text-[#1D4ED8]" : "text-[#9CA3AF]"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-6.25 mt-0.5 flex flex-col gap-0.5 border-l border-[#E9EAEC] py-0.5 pl-3">
            {items.map((child) => (
              <NavItem
                key={child.href}
                label={child.label}
                href={child.href}
                addHref={child.addHref}
                exact={child.exact}
                indent
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}