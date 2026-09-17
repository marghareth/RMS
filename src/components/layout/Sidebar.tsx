// FILE: src/components/layout/Sidebar.tsx
//
// REDESIGN: replaces the single 240px column that held Dashboard, Visitor
// Log, and 8 accordion groups (30+ children once fully expanded) in one
// scrolling list. Expanding "Finance" used to push "Reports" and "Admin"
// off the bottom of the screen.
//
// Now a two-stage nav: a 60px "spine" of module tabs (icon + short label,
// like file-cabinet index tabs), and a 212px "rail" that shows only the
// active module's own pages. Which module is "active" is derived purely
// from the current route — clicking a spine tab for a single-page module
// (Dashboard, Blotter, ...) navigates there directly; clicking a
// multi-page module navigates to its first permitted child, and the rail
// then fills in with that module's other pages.
//
// Same `mainNav` / `bottomNav` data and the same `hasPermission` filtering
// as before — only the rendering changed, so a role that couldn't see a
// page still can't see its tab or its rail entry.
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import type { LucideIcon } from "lucide-react";
import NavItem from "./NavItem";
import { hasPermission } from "@/lib/permission";

type Child = {
  label: string;
  href: string;
  addHref?: string;
  exact?: boolean;
  permission: string | string[];
};

type ModuleItem =
  | {
      type: "link";
      label: string;
      spineLabel: string;
      href: string;
      icon: LucideIcon;
      addHref?: string;
      permission: string | string[];
    }
  | {
      type: "group";
      label: string;
      spineLabel: string;
      icon: LucideIcon;
      basePath: string;
      children: Child[];
    };

// Every link/child below carries a `permission` — the exact string (or,
// for pages that fan out to several endpoints, list of strings — ALL
// required) that its page's underlying API route(s) check via
// requirePermission(). Sourced directly from src/app/api/**/route.ts, not
// guessed, so a role only ever sees a tab or rail entry it can actually
// load without hitting a 403.

const mainNav: ModuleItem[] = [
  { type: "link", label: "Dashboard", spineLabel: "Home", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { type: "link", label: "Visitor Log", spineLabel: "Visitors", href: "/visitors", icon: LogIn, addHref: "/visitors/new", permission: "visitors:read" },
  {
    type: "group",
    label: "RBI",
    spineLabel: "RBI",
    icon: Users,
    basePath: "/residents",
    children: [
      { label: "Residents", href: "/residents", addHref: "/residents/new", permission: "residents:read" },
      { label: "Households", href: "/households", addHref: "/households/new", permission: "households:read" },
      { label: "Deceased Records", href: "/deceased", permission: "deceased:read" },
    ],
  },
  {
    type: "group",
    label: "Registries",
    spineLabel: "Lists",
    icon: IdCard,
    basePath: "/registries",
    children: [
      { label: "Senior Citizens", href: "/registries/senior-citizens", permission: "registries:read" },
      { label: "PWD", href: "/registries/pwd", permission: "registries:read" },
      { label: "4Ps Beneficiaries", href: "/registries/four-ps", permission: "registries:read" },
    ],
  },
  {
    type: "group",
    label: "Documents",
    spineLabel: "Docs",
    icon: FileText,
    basePath: "/certificates",
    children: [
      { label: "All Certificates", href: "/certificates", addHref: "/certificates/new", permission: "certificates:read" },
      { label: "Document Queue", href: "/document-queue", permission: "certificates:read" },
      { label: "Document Release", href: "/document-release", permission: "certificates:read" },
      { label: "Barangay ID", href: "/barangay_id", addHref: "/barangay_id/new", permission: "barangay_id:read" },
    ],
  },
  { type: "link", label: "Blotter", spineLabel: "Blotter", href: "/blotter", icon: ScrollText, addHref: "/blotter/new", permission: "blotter:read" },
  {
    type: "group",
    label: "Health",
    spineLabel: "Health",
    icon: HeartPulse,
    basePath: "/health",
    children: [
      { label: "Health Records", href: "/health", addHref: "/health/new", permission: "health:read" },
      { label: "Vaccinations", href: "/health/vaccinations", addHref: "/health/vaccinations/new", permission: "health:read" },
    ],
  },
  {
    type: "group",
    label: "Inventory",
    spineLabel: "Assets",
    icon: Package,
    basePath: "/equipment",
    children: [
      { label: "Equipment", href: "/equipment", addHref: "/equipment/new", permission: "equipment:read" },
      { label: "Borrow Item", href: "/equipment/borrow", permission: "equipment:read" },
      { label: "Return Item", href: "/equipment/return", permission: "equipment:read" },
    ],
  },
  {
    // Legacy income/expense ledger — kept as its own tab, distinct from
    // the Finance suite below, since the two modules aren't merged (see
    // the note on the Finance group).
    type: "group",
    label: "Financial",
    spineLabel: "Ledger",
    icon: DollarSign,
    basePath: "/financial",
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
    type: "group",
    label: "Finance",
    spineLabel: "Budget",
    icon: Landmark,
    basePath: "/finance",
    children: [
      {
        label: "Budget Overview",
        href: "/finance/overview",
        // Fans out to all four endpoints in parallel — only show it if
        // the role can actually load every one of them.
        permission: ["fund-sources:read", "appropriations:read", "revenues:read", "disbursements:read"],
      },
      { label: "Appropriations", href: "/finance/appropriations", permission: "appropriations:read" },
      { label: "Revenue Tracking", href: "/finance/revenues", permission: "revenues:read" },
      { label: "Fund Sources", href: "/finance/fund-sources", permission: "fund-sources:read" },
      { label: "Disbursements", href: "/finance/disbursements", permission: "disbursements:read" },
    ],
  },
  { type: "link", label: "Assembly", spineLabel: "Assembly", href: "/meetings", icon: Users2, addHref: "/meetings/new", permission: "meetings:read" },
  { type: "link", label: "Calendar", spineLabel: "Calendar", href: "/calendar", icon: Calendar, permission: "calendar:read" },
  { type: "link", label: "Officials", spineLabel: "Officials", href: "/officials", icon: UserCheck, addHref: "/officials/new", permission: "officials:read" },
  {
    type: "group",
    label: "Reports",
    spineLabel: "Reports",
    icon: BarChart2,
    basePath: "/reports",
    children: [
      { label: "Overview", href: "/reports", exact: true, permission: "reports:read" },
      { label: "Population", href: "/reports/population", permission: "reports:read" },
      { label: "Registries", href: "/reports/registries", permission: "reports:read" },
      { label: "Certificates", href: "/reports/certificates", permission: "reports:read" },
      { label: "Blotter", href: "/reports/blotter", permission: "reports:read" },
      { label: "Financial", href: "/reports/financial", permission: "reports:read" },
      { label: "Inventory", href: "/reports/inventory", permission: "reports:read" },
    ],
  },
];

const bottomNav: ModuleItem[] = [
  {
    type: "group",
    label: "Admin",
    spineLabel: "Admin",
    icon: ShieldCheck,
    basePath: "/admin",
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
  { type: "link", label: "Settings", spineLabel: "Setup", href: "/admin/settings", icon: Settings, permission: "settings:read" },
];

// `permission` is either one required string, or a list where ALL must be
// held (used by pages that fan out to several endpoints at once).
function isAllowed(role: string, permission: string | string[]): boolean {
  if (Array.isArray(permission)) return permission.every((p) => hasPermission(role, p));
  return hasPermission(role, permission);
}

function basePathOf(item: ModuleItem): string {
  return item.type === "group" ? item.basePath : item.href;
}

function isModuleActive(item: ModuleItem, pathname: string): boolean {
  const base = basePathOf(item);
  if (pathname === base || pathname.startsWith(base + "/")) return true;
  if (item.type === "group") {
    return item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
  }
  return false;
}

function visibleOf(items: ModuleItem[], role: string): ModuleItem[] {
  return items
    .map((item) =>
      item.type === "group"
        ? { ...item, children: item.children.filter((c) => isAllowed(role, c.permission)) }
        : item
    )
    .filter((item) => (item.type === "group" ? item.children.length > 0 : isAllowed(role, item.permission)));
}

// Barangay name comes from Settings (General Settings → Barangay
// Information) so the rail's subtitle reflects whichever barangay this
// instance is deployed for, instead of a hardcoded name.
function useBarangayName(): string {
  const [name, setName] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/branding")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data?.barangay_name) setName(data.barangay_name);
      })
      .catch(() => {
        // Non-fatal — the rail subtitle just falls back to the generic
        // label rendered below.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return name;
}

function SpineButton({
  item,
  active,
  onClick,
}: {
  item: ModuleItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      className={`relative flex flex-col items-center gap-1 px-1 py-2.25 transition-colors ${
        active
          ? "bg-white text-[#1B2230] dark:bg-[#151822] dark:text-[#E8E9EE]"
          : "text-[#8891A3] hover:bg-[#1B2029] hover:text-[#E8E9EE]"
      }`}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-0.75 bg-[#3B82F6]" />}
      <Icon size={18} strokeWidth={1.6} />
      <span className="max-w-13 text-center text-[9px] leading-[1.1]">{item.spineLabel}</span>
    </button>
  );
}

export default function Sidebar({
  collapsed,
  onToggle,
  className = "",
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "";
  const barangayName = useBarangayName();

  const visibleMain = visibleOf(mainNav, role);
  const visibleBottom = visibleOf(bottomNav, role);
  const allModules = [...visibleMain, ...visibleBottom];

  const activeModule = allModules.find((m) => isModuleActive(m, pathname)) ?? null;

  function handleSpineClick(item: ModuleItem) {
    if (item.type === "link") {
      router.push(item.href);
    } else {
      // Navigate to the first page this role can actually see inside the
      // module; the rail fills in with the rest once the route change
      // lands, since `activeModule` is derived from the new pathname.
      const first = item.children[0];
      if (first) router.push(first.href);
    }
    // On mobile the rail is an overlay drawer — picking a module should
    // open/keep it open so its pages are reachable, same as a rail link.
    if (collapsed && window.matchMedia("(max-width: 1023px)").matches) onToggle();
  }

  return (
    <>
      {/* ══ Spine — always visible, one tab per module ══ */}
      <nav
        className={`flex h-screen w-15 shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-black/20 bg-[#12151C] pb-2 ${className}`}
      >
        <div className="flex h-15 shrink-0 items-center justify-center border-b border-white/[0.07]">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path d="M12 2.6 20.2 8v1.5H3.8V8L12 2.6Z" fill="#3B82F6" />
            <rect x="5.4" y="10.6" width="2.3" height="7.4" fill="#3B82F6" />
            <rect x="10.85" y="10.6" width="2.3" height="7.4" fill="#3B82F6" />
            <rect x="16.3" y="10.6" width="2.3" height="7.4" fill="#3B82F6" />
            <rect x="3.4" y="19.2" width="17.2" height="2.2" rx="1" fill="#3B82F6" />
          </svg>
        </div>

        <div className="flex flex-col gap-0.5 py-2">
          {visibleMain.map((item) => (
            <SpineButton
              key={item.label}
              item={item}
              active={activeModule?.label === item.label}
              onClick={() => handleSpineClick(item)}
            />
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-white/[0.07] pt-2">
          {visibleBottom.map((item) => (
            <SpineButton
              key={item.label}
              item={item}
              active={activeModule?.label === item.label}
              onClick={() => handleSpineClick(item)}
            />
          ))}
        </div>
      </nav>

      {/* ══ Rail — the active module's own pages ══ */}
      <aside
        className={`fixed inset-y-0 left-15 z-40 flex w-53 flex-col overflow-hidden border-r border-[#E1E3E8] bg-white transition-transform duration-200 ease-in-out dark:border-[#282D3A] dark:bg-[#151822] lg:static lg:inset-auto lg:translate-x-0 lg:transition-[width] ${
          collapsed ? "-translate-x-[calc(100%+3.75rem)] lg:w-0 lg:border-r-0" : "translate-x-0 lg:w-53"
        } ${collapsed ? "" : "shadow-2xl lg:shadow-none"}`}
      >
        <div className="flex h-15 shrink-0 flex-col justify-center border-b border-[#ECEDF1] px-4 dark:border-[#20242F]">
          <b className="truncate text-[13px] font-semibold text-[#1B2230] dark:text-[#E8E9EE]">
            {activeModule?.label ?? "Barangay RMS"}
          </b>
          <small className="truncate text-[10.5px] text-[#9096A3] dark:text-[#767D8F]">
            {barangayName || "Records Management"}
          </small>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2.5">
          {activeModule?.type === "group" ? (
            activeModule.children.map((child) => (
              <NavItem
                key={child.href}
                label={child.label}
                href={child.href}
                addHref={child.addHref}
                exact={child.exact}
              />
            ))
          ) : activeModule ? (
            <>
              <NavItem label={activeModule.label} href={activeModule.href} icon={activeModule.icon} exact />
              {activeModule.addHref && (
                <NavItem label={`New ${activeModule.label}`} href={activeModule.addHref} icon={activeModule.icon} />
              )}
            </>
          ) : (
            <p className="px-2 py-3 text-[12px] text-[#9096A3] dark:text-[#767D8F]">
              Pick a module from the left.
            </p>
          )}
        </div>
      </aside>

      {/* Scrim behind the rail when it's an overlay drawer on mobile */}
      {!collapsed && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}
    </>
  );
}