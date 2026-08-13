// FILE: src/lib/route-permissions.ts
//
// SECURITY FIX: previously the only thing keeping a low-privilege role out
// of a page it shouldn't see (e.g. /admin/audit-logs, /finance/overview)
// was Sidebar.tsx hiding the *link* to it. The page itself had no guard,
// so anyone who typed the URL directly still got the full page shell
// (layout, filters, buttons) even though the underlying API calls would
// come back 401/403. That's security-through-obscurity, not real
// authorization.
//
// This file is the single source of truth mapping a dashboard URL prefix
// to the permission(s) required to view it — deliberately mirrors the
// `permission` fields already declared in Sidebar.tsx's `mainNav` /
// `bottomNav`, since those were already sourced from each page's
// underlying API route(s) (see the comment at the top of Sidebar.tsx).
//
// Kept dependency-free (no lucide-react/React imports) so it's safe to
// import from `middleware.ts`, which runs on the Edge runtime.
//
// `permission` is either one required string, or an array where ALL are
// required (mirrors Sidebar's `isAllowed` semantics for fan-out pages like
// /finance/overview).
//
// Longer/more specific prefixes MUST come before shorter ones of the same
// branch (e.g. "/finance/overview" before "/finance") since matching below
// is "does the pathname start with this prefix", first match wins.

export type RoutePermission = string | string[];

export const ROUTE_PERMISSIONS: { prefix: string; permission: RoutePermission }[] = [
  { prefix: "/dashboard", permission: "dashboard:read" },
  { prefix: "/visitors", permission: "visitors:read" },

  // ── RBI ──
  { prefix: "/residents", permission: "residents:read" },
  { prefix: "/households", permission: "households:read" },
  { prefix: "/deceased", permission: "deceased:read" },

  // ── Registries ──
  { prefix: "/registries", permission: "registries:read" },

  // ── Documents ──
  { prefix: "/certificates/templates", permission: "certificates:read" },
  { prefix: "/certificates", permission: "certificates:read" },
  { prefix: "/document-queue", permission: "certificates:read" },
  { prefix: "/document-release", permission: "certificates:read" },
  { prefix: "/barangay_id", permission: "barangay_id:read" },

  { prefix: "/blotter", permission: "blotter:read" },

  // ── Health ──
  { prefix: "/health", permission: "health:read" },

  // ── Inventory ──
  { prefix: "/equipment", permission: "equipment:read" },

  // ── Legacy Financial module ──
  { prefix: "/financial", permission: "financial:read" },

  // ── Finance suite (2.6) — overview fans out to all four endpoints ──
  {
    prefix: "/finance/overview",
    permission: ["fund-sources:read", "appropriations:read", "revenues:read", "disbursements:read"],
  },
  { prefix: "/finance/appropriations", permission: "appropriations:read" },
  { prefix: "/finance/revenues", permission: "revenues:read" },
  { prefix: "/finance/fund-sources", permission: "fund-sources:read" },
  { prefix: "/finance/disbursements", permission: "disbursements:read" },

  { prefix: "/meetings", permission: "meetings:read" },
  { prefix: "/calendar", permission: "calendar:read" },
  { prefix: "/officials", permission: "officials:read" },
  { prefix: "/reports", permission: "reports:read" },

  // ── Admin ──
  { prefix: "/admin/users", permission: "users:read" },
  // GET /api/puroks only requires residents:read — write actions are
  // separately gated behind settings:write inside the page itself.
  { prefix: "/admin/puroks", permission: "residents:read" },
  { prefix: "/admin/audit-logs", permission: "audit-logs:read" },
  // No dedicated backup:read — GET /api/backup is gated behind
  // backup:write too, which only ADMIN holds.
  { prefix: "/admin/backup", permission: "backup:write" },
  { prefix: "/admin/settings", permission: "settings:read" },
];

/**
 * Returns the permission requirement for the most specific matching route,
 * or null if the path isn't a permission-gated dashboard route (e.g.
 * /login, /access-denied, or anything not listed above — those are left
 * to just "must be authenticated", enforced separately by middleware).
 */
export function findRoutePermission(pathname: string): RoutePermission | null {
  // Sort by prefix length descending each call is unnecessary overhead-wise
  // for a list this small, but keeps the "most specific match wins" rule
  // correct even if entries are reordered later.
  const match = [...ROUTE_PERMISSIONS]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));

  return match ? match.permission : null;
}