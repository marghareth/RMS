// FILE: src/components/layout/Sidebar.tsx
//
// REDESIGN (client-requested): back to a single scrolling column, styled
// after the client's reference mockup — a flat list of module rows, each
// either a plain link (Dashboard, Blotter, Calendar, ...) or an
// expandable group (RBI, Documents, Finance, ...). Whichever module the
// current route belongs to renders as a solid rounded "pill" — same
// treatment whether it's a standalone link or an expanded group header —
// with its pages listed underneath, small icon chip first, bolder text
// on the selected one.
//
// This replaces the previous two-stage "spine + rail" layout (a 60px
// column of icon-only tabs next to a 212px page list). That version
// existed to stop a long list of modules + expanded groups from
// overflowing awkwardly; here every group can still be expanded
// independently, so if a very long expansion becomes a problem again,
// the fix is to constrain groups to one-open-at-a-time rather than
// reintroducing a second panel.
//
// The Topbar's hamburger button (`onMenuClick`/`collapsed`) now toggles
// this single panel directly on every screen size — width animates to 0
// on desktop (`lg:w-0`), slides off-screen as an overlay drawer below the
// `lg` breakpoint — rather than only affecting a second "rail" panel that
// no longer exists.
//
// Same `mainNav` / `bottomNav` data (permission-filtered via
// `hasPermission`) as both previous versions — only the rendering
// changed, so a role that couldn't see a page still can't see its row.
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
import NavGroup from "./NavGroup";
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
      href: string;
      icon: LucideIcon;
      addHref?: string;
      permission: string | string[];
    }
  | {
      type: "group";
      label: string;
      icon: LucideIcon;
      basePath: string;
      children: Child[];
    };

// Every link/child below carries a `permission` — the exact string (or,
// for pages that fan out to several endpoints, list of strings — ALL
// required) that its page's underlying API route(s) check via
// requirePermission(). Sourced directly from src/app/api/**/route.ts, not
// guessed, so a role only ever sees a row it can actually load without
// hitting a 403.

const mainNav: ModuleItem[] = [
  { type: "link", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { type: "link", label: "Visitor Log", href: "/visitors", icon: LogIn, permission: "visitors:read" },
  {
    type: "group",
    label: "RBI",
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
    icon: FileText,
    basePath: "/certificates",
    children: [
      { label: "All Certificates", href: "/certificates", addHref: "/certificates/new", permission: "certificates:read" },
      { label: "Document Queue", href: "/document-queue", permission: "certificates:read" },
      { label: "Document Release", href: "/document-release", permission: "certificates:read" },
      { label: "Barangay ID", href: "/barangay_id", addHref: "/barangay_id/new", permission: "barangay_id:read" },
    ],
  },
  { type: "link", label: "Blotter", href: "/blotter", icon: ScrollText, addHref: "/blotter/new", permission: "blotter:read" },
  {
    type: "group",
    label: "Health",
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
    icon: Package,
    basePath: "/equipment",
    children: [
      { label: "Equipment", href: "/equipment", addHref: "/equipment/new", permission: "equipment:read" },
      { label: "Borrow Item", href: "/equipment/borrow", permission: "equipment:read" },
      { label: "Return Item", href: "/equipment/return", permission: "equipment:read" },
    ],
  },
  {
    // Legacy income/expense ledger — kept as its own row, distinct from
    // the Finance suite below, since the two modules aren't merged (see
    // the note on the Finance group).
    type: "group",
    label: "Financial",
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
  { type: "link", label: "Assembly", href: "/meetings", icon: Users2, addHref: "/meetings/new", permission: "meetings:read" },
  { type: "link", label: "Calendar", href: "/calendar", icon: Calendar, permission: "calendar:read" },
  { type: "link", label: "Officials", href: "/officials", icon: UserCheck, addHref: "/officials/new", permission: "officials:read" },
  {
    type: "group",
    label: "Reports",
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
  { type: "link", label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings:read" },
];

// `permission` is either one required string, or a list where ALL must be
// held (used by pages that fan out to several endpoints at once).
function isAllowed(role: string, permission: string | string[]): boolean {
  if (Array.isArray(permission)) return permission.every((p) => hasPermission(role, p));
  return hasPermission(role, permission);
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
// Information) so the header subtitle reflects whichever barangay this
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
        // Non-fatal — the header subtitle just falls back to the generic
        // label rendered below.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return name;
}

// Onboarding-tour hooks for specific nav rows (see src/lib/onboarding/steps.ts).
// Only rows common to most roles are worth targeting — TourOverlay skips a
// step gracefully if its target isn't in the DOM, but there's no point
// aiming at something most roles will never see.
const TOUR_ID_BY_LABEL: Record<string, string> = {
  Dashboard: "nav-dashboard",
  RBI: "nav-rbi",
  Documents: "nav-documents",
};

function renderModule(item: ModuleItem) {
  const tourId = TOUR_ID_BY_LABEL[item.label];

  if (item.type === "link") {
    const navItem = <NavItem label={item.label} href={item.href} icon={item.icon} addHref={item.addHref} variant="top" />;
    return tourId ? (
      <div key={item.label} data-tour={tourId}>
        {navItem}
      </div>
    ) : (
      <div key={item.label}>{navItem}</div>
    );
  }

  const navGroup = <NavGroup label={item.label} icon={item.icon} basePath={item.basePath} items={item.children} />;
  return tourId ? (
    <div key={item.label} data-tour={tourId}>
      {navGroup}
    </div>
  ) : (
    <div key={item.label}>{navGroup}</div>
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
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "";
  const barangayName = useBarangayName();

  const visibleMain = visibleOf(mainNav, role);
  const visibleBottom = visibleOf(bottomNav, role);

  // Close the mobile overlay drawer automatically after a navigation, so
  // tapping a link (or a child inside an expanded group) doesn't leave the
  // drawer sitting open over the new page. Skips the very first run (mount)
  // — that case is already handled by the dashboard layout's own
  // close-on-mobile effect, and firing here too would race it. Harmless on
  // desktop too if the sidebar happens to be collapsed there — it's a
  // no-op since `collapsed` is already what this would set it to.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!collapsed && window.matchMedia("(max-width: 1023px)").matches) onToggle();
    // Only re-run when the route actually changes — `onToggle`/`collapsed`
    // intentionally excluded to avoid an immediate close-on-open loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-hidden border-r border-[#E9EAEC] bg-white transition-transform duration-200 ease-in-out dark:border-[#262626] dark:bg-[#111111] lg:static lg:inset-auto lg:translate-x-0 lg:transition-[width] ${
          collapsed ? "-translate-x-full lg:w-0 lg:border-r-0" : "translate-x-0 shadow-2xl lg:w-64 lg:shadow-none"
        } ${className}`}
      >
        <div data-tour="sidebar-logo" className="flex min-h-15 shrink-0 items-start gap-2.5 border-b border-[#E9EAEC] px-4 py-3 dark:border-[#262626]">
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-6 w-6 shrink-0">
            <path d="M12 2.6 20.2 8v1.5H3.8V8L12 2.6Z" fill="#3B82F6" />
            <rect x="5.4" y="10.6" width="2.3" height="7.4" fill="#3B82F6" />
            <rect x="10.85" y="10.6" width="2.3" height="7.4" fill="#3B82F6" />
            <rect x="16.3" y="10.6" width="2.3" height="7.4" fill="#3B82F6" />
            <rect x="3.4" y="19.2" width="17.2" height="2.2" rx="1" fill="#3B82F6" />
          </svg>
          <div className="min-w-0">
            <b className="line-clamp-2 wrap-break-word text-[15px] font-semibold leading-tight text-[#1F2937] dark:text-white">Barangay Records Management System</b>
            <small className="block truncate text-[10.5px] text-[#6B7280] dark:text-[#9CA3AF]">
              {barangayName || "Records Management"}
            </small>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
          {visibleMain.map(renderModule)}
        </nav>

        {visibleBottom.length > 0 && (
          <div className="flex flex-col gap-0.5 border-t border-[#E9EAEC] px-3 py-3 dark:border-[#262626]">
            {visibleBottom.map(renderModule)}
          </div>
        )}
      </aside>

      {/* Scrim behind the drawer when it's open as a mobile overlay */}
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