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
  indent?: boolean;
  exact?: boolean;
}

export default function NavItem({
  label,
  href,
  icon: Icon,
  addHref,
  addLabel,
  indent = false,
  exact = false,
}: NavItemProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="group/item relative flex items-center">
      {indent && active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-full bg-[#3B82F6]" />
      )}

      <Link
        href={href}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-colors ${
          indent ? "pl-4 pr-2" : "px-3 py-2.5"
        } ${
          active
            ? indent
              ? "bg-[#F4F5F7] font-semibold text-[#1F2937]"
              : "bg-[#3B82F6] text-white shadow-sm"
            : "text-[#6B7280] hover:bg-[#F4F5F7] hover:text-[#1F2937]"
        }`}
      >
        {Icon && (
          <Icon
            size={18}
            strokeWidth={active ? 2.25 : 2}
            className={`shrink-0 ${
              active ? "text-white" : "text-[#9CA3AF] group-hover/item:text-[#374151]"
            }`}
          />
        )}
        <span className="truncate">{label}</span>
      </Link>

      {addHref && (
        <Link
          href={addHref}
          aria-label={addLabel ?? `Add ${label}`}
          className={`mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/item:opacity-100 ${
            active && !indent
              ? "text-white hover:bg-white/20"
              : "text-[#9CA3AF] hover:bg-[#E9EAEC] hover:text-[#374151]"
          }`}
        >
          <Plus size={13} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}