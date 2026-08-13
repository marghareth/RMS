// FILE: src/components/layout/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  IdCard,
  FileText,
  ScrollText,
  HeartPulse,
  Package,
  DollarSign,
  Landmark,
  Users2,
  UserCheck,
  BarChart2,
  ShieldCheck,
  Settings,
  LogIn,
  Calendar,
} from "lucide-react";
import NavItem from "./NavItem";
import NavGroup from "./NavGroup";
import { hasPermission } from "@/lib/permission";

// Every link/child below carries a `permission` — the exact string (or,
// for pages that fan out to several endpoints, list of strings — ALL
// required) that its page's underlying API route(s) check via
// requirePermission(). Sourced directly from src/app/api/**/route.ts, not
// guessed, so a role only ever sees a link it can actually load without
// hitting a 403.

// Grouped + single items, in display order
const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, type: "link" as const, permission: "dashboard:read" },
  {
    label: "Visitor Log",
    href: "/visitors",
    icon: LogIn,
    addHref: "/visitors/new",
    type: "link" as const,
    permission: "visitors:read",
  },
  {
    label: "RBI",
    icon: Users,
    basePath: "/residents",
    type: "group" as const,
    children: [
      { label: "Residents", href: "/residents", addHref: "/residents/new", permission: "residents:read" },
      { label: "Households", href: "/households", addHref: "/households/new", permission: "households:read" },
      { label: "Deceased Records", href: "/deceased", permission: "deceased:read" },
    ],
  },
  {
    label: "Registries",
    icon: IdCard,
    basePath: "/registries",
    type: "group" as const,
    children: [
      { label: "Senior Citizens", href: "/registries/senior-citizens", permission: "registries:read" },
      { label: "PWD", href: "/registries/pwd", permission: "registries:read" },
      { label: "4Ps Beneficiaries", href: "/registries/four-ps", permission: "registries:read" },
    ],
  },
  {
    label: "Documents",
    icon: FileText,
    basePath: "/certificates",
    type: "group" as const,
    children: [
      { label: "All Certificates", href: "/certificates", addHref: "/certificates/new", permission: "certificates:read" },
      { label: "Document Queue", href: "/document-queue", permission: "certificates:read" },
      { label: "Document Release", href: "/document-release", permission: "certificates:read" },
      { label: "Barangay ID", href: "/barangay_id", addHref: "/barangay_id/new", permission: "barangay_id:read" },
    ],
  },
  {
    label: "Blotter",
    href: "/blotter",
    icon: ScrollText,
    addHref: "/blotter/new",
    type: "link" as const,
    permission: "blotter:read",
  },
  {
    label: "Health",
    icon: HeartPulse,
    basePath: "/health",
    type: "group" as const,
    children: [
      { label: "Health Records", href: "/health", addHref: "/health/new", permission: "health:read" },
      { label: "Vaccinations", href: "/health/vaccinations", addHref: "/health/vaccinations/new", permission: "health:read" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    basePath: "/equipment",
    type: "group" as const,
    children: [
      { label: "Equipment", href: "/equipment", addHref: "/equipment/new", permission: "equipment:read" },
      { label: "Borrow Item", href: "/equipment/borrow", permission: "equipment:read" },
      { label: "Return Item", href: "/equipment/return", permission: "equipment:read" },
    ],
  },
  {
    label: "Financial",
    icon: DollarSign,
    basePath: "/financial",
    type: "group" as const,
    children: [
      { label: "Records", href: "/financial", addHref: "/financial/new", permission: "financial:read" },
      { label: "Summary", href: "/financial/summary", permission: "financial:read" },
    ],
  },
  {
    // Finance Suite (2.6) — appropriations/revenue/fund-source/disbursement
    // tracking, distinct from the legacy income/expense "Financial" module
    // above. Kept as its own group rather than merged into "Financial" so
    // existing links into that module don't shift meaning.
    label: "Finance",
    icon: Landmark,
    basePath: "/finance",
    type: "group" as const,
    children: [
      // Overview fans out to all four endpoints in parallel — only show it
      // if the role can actually load every one of them.
      {
        label: "Budget Overview",
        href: "/finance/overview",
        permission: ["fund-sources:read", "appropriations:read", "revenues:read", "disbursements:read"],
      },
      { label: "Appropriations", href: "/finance/appropriations", permission: "appropriations:read" },
      { label: "Revenue Tracking", href: "/finance/revenues", permission: "revenues:read" },
      { label: "Fund Sources", href: "/finance/fund-sources", permission: "fund-sources:read" },
      { label: "Disbursements", href: "/finance/disbursements", permission: "disbursements:read" },
    ],
  },
  {
    label: "Assembly",
    href: "/meetings",
    icon: Users2,
    addHref: "/meetings/new",
    type: "link" as const,
    permission: "meetings:read",
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
    type: "link" as const,
    permission: "calendar:read",
  },
  {
    label: "Officials",
    href: "/officials",
    icon: UserCheck,
    addHref: "/officials/new",
    type: "link" as const,
    permission: "officials:read",
  },
  {
    label: "Reports",
    icon: BarChart2,
    basePath: "/reports",
    type: "group" as const,
    children: [
      { label: "Overview", href: "/reports", permission: "reports:read" },
      { label: "Population", href: "/reports/population", permission: "reports:read" },
      { label: "Registries", href: "/reports/registries", permission: "reports:read" },
      { label: "Certificates", href: "/reports/certificates", permission: "reports:read" },
      { label: "Blotter", href: "/reports/blotter", permission: "reports:read" },
      { label: "Financial", href: "/reports/financial", permission: "reports:read" },
      { label: "Inventory", href: "/reports/inventory", permission: "reports:read" },
    ],
  },
];

const bottomNav = [
  {
    label: "Admin",
    icon: ShieldCheck,
    basePath: "/admin",
    type: "group" as const,
    children: [
      { label: "Users", href: "/admin/users", addHref: "/admin/users/new", permission: "users:read" },
      // GET /api/puroks only requires residents:read (any role viewing
      // residents can view the purok list) — write actions are separately
      // gated behind settings:write inside the page itself.
      { label: "Puroks", href: "/admin/puroks", permission: "residents:read" },
      { label: "Audit Logs", href: "/admin/audit-logs", permission: "audit-logs:read" },
      // No dedicated backup:read — GET /api/backup is gated behind
      // backup:write too, which only ADMIN holds.
      { label: "Backup", href: "/admin/backup", permission: "backup:write" },
    ],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    type: "link" as const,
    permission: "settings:read",
  },
];

// `permission` is either one required string, or a list where ALL must be
// held (used by pages that fan out to several endpoints at once).
function isAllowed(role: string, permission: string | string[]): boolean {
  if (Array.isArray(permission)) return permission.every((p) => hasPermission(role, p));
  return hasPermission(role, permission);
}

export default function Sidebar({
  collapsed,
  className = "",
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  // Barangay name comes from Settings (General Settings → Barangay
  // Information) so the sidebar brand reflects whichever barangay this
  // instance is deployed for, instead of a hardcoded name.
  const [barangayName, setBarangayName] = useState("");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/branding")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data?.barangay_name) setBarangayName(data.barangay_name);
      })
      .catch(() => {
        // Non-fatal — the brand just falls back to the generic label below.
      });
    return () => { cancelled = true; };
  }, []);

  const visibleMainNav = mainNav
    .map((item) =>
      item.type === "group"
        ? { ...item, children: item.children.filter((c) => isAllowed(role, c.permission)) }
        : item
    )
    .filter((item) => (item.type === "group" ? item.children.length > 0 : isAllowed(role, item.permission)));

  const visibleBottomNav = bottomNav
    .map((item) =>
      item.type === "group"
        ? { ...item, children: item.children.filter((c) => isAllowed(role, c.permission)) }
        : item
    )
    .filter((item) => (item.type === "group" ? item.children.length > 0 : isAllowed(role, item.permission)));

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-[#E9EAEC] bg-white transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-0 border-r-0" : "w-60"
      } ${className}`}
    >
      {/* Brand */}
      <div className="flex h-15 shrink-0 items-center gap-2.5 border-b border-[#E9EAEC] px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              fill="white"
            />
            <rect x="9" y="12" width="6" height="10" fill="#3B82F6" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black uppercase tracking-wide text-[#1F2937]">
            {barangayName || "Barangay RMS"}
          </p>
          <p className="truncate text-[10px] text-[#9CA3AF]">Records Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-1">
          {visibleMainNav.map((item) =>
            item.type === "group" ? (
              <NavGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                basePath={item.basePath}
                items={item.children}
              />
            ) : (
              <NavItem
                key={item.label}
                label={item.label}
                href={item.href}
                icon={item.icon}
                addHref={item.addHref}
              />
            )
          )}
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-[#E9EAEC] pt-4">
          {visibleBottomNav.map((item) =>
            item.type === "group" ? (
              <NavGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                basePath={item.basePath}
                items={item.children}
              />
            ) : (
              <NavItem
                key={item.label}
                label={item.label}
                href={item.href}
                icon={item.icon}
              />
            )
          )}
        </div>
      </nav>
    </aside>
  );
}