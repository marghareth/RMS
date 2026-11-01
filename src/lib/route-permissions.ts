// FILE: src/lib/route-permissions.ts
//
// SECURITY: page-level authorization. Previously the only thing keeping a
// low-privilege role out of a page it shouldn't see (e.g. /admin/audit-logs,
// /finance/overview) was Sidebar.tsx hiding the *link* to it — the page
// itself had no guard, so anyone who typed the URL still got the full page
// shell even though the underlying API calls came back 401/403. That's
// security-through-obscurity, not authorization.
//
// This file is the single source of truth mapping a dashboard URL prefix to
// the permission(s) required to view it, and `middleware.ts` now enforces
// it on every request (redirecting to /access-denied). It mirrors the
// `permission` fields declared in Sidebar.tsx's nav config, which were
// themselves sourced from each page's underlying API route(s). The API
// routes remain the real data-level authority (requirePermission) — this
// is the matching guard for the page shells.
//
// Runs on the Edge runtime (middleware), so this module and
// `./permission` must stay dependency-free: no Prisma, no Node APIs, no
// React/lucide imports.
//
// `permission` is either one required string, or an array where ALL are
// required (mirrors Sidebar's `isAllowed` semantics for fan-out pages like
// /finance/overview).
//
// Matching is longest-prefix-wins (see `findRoutePermission`), so entry
// order below does not affect correctness. A `*` segment matches any one
// path segment, e.g. "/residents/*/edit" covers /residents/42/edit.
//
// ACCESS POLICY (Nov 2026): every page that adds or edits a record needs
// the module's :write permission, so a view-only role can't even open the
// form (it's sent to /access-denied) — see the header of ./permission.ts.

import { hasPermission } from "./permission";

export type RoutePermission = string | string[];

export const ROUTE_PERMISSIONS: { prefix: string; permission: RoutePermission }[] = [
  { prefix: "/dashboard", permission: "dashboard:read" },
  { prefix: "/visitors", permission: "visitors:read" },

  // ── RBI ──
  // Registering and bulk-importing residents write data, so the pages need
  // residents:write (longest prefix wins, so these beat "/residents" below).
  { prefix: "/residents/new", permission: "residents:write" },
  { prefix: "/residents/import", permission: "residents:write" },
  { prefix: "/residents/*/edit", permission: "residents:write" },
  { prefix: "/residents", permission: "residents:read" },
  { prefix: "/households/new", permission: "households:write" },
  { prefix: "/households/*/edit", permission: "households:write" },
  { prefix: "/households", permission: "households:read" },
  { prefix: "/deceased", permission: "deceased:read" },

  // ── Registries ──
  { prefix: "/registries", permission: "registries:read" },

  // ── Documents ──
  { prefix: "/certificates/new", permission: "certificates:write" },
  { prefix: "/certificates/templates", permission: "certificates:read" },
  { prefix: "/certificates", permission: "certificates:read" },
  { prefix: "/document-queue", permission: "certificates:read" },
  { prefix: "/document-release", permission: "certificates:read" },
  { prefix: "/barangay-id/new", permission: "barangay_id:write" },
  { prefix: "/barangay-id", permission: "barangay_id:read" },

  { prefix: "/blotter/new", permission: "blotter:write" },
  // /blotter/[id]/hearing only prints a notice, so it stays at :read.
  { prefix: "/blotter", permission: "blotter:read" },

  // ── Health ──
  { prefix: "/health/new", permission: "health:write" },
  { prefix: "/health/*/edit", permission: "health:write" },
  { prefix: "/health/vaccinations/new", permission: "health:write" },
  { prefix: "/health", permission: "health:read" },

  // ── Inventory ──
  { prefix: "/equipment/new", permission: "equipment:write" },
  { prefix: "/equipment/*/edit", permission: "equipment:write" },
  { prefix: "/equipment/borrow", permission: "equipment:write" },
  { prefix: "/equipment/return", permission: "equipment:write" },
  { prefix: "/equipment", permission: "equipment:read" },

  // ── Legacy Financial module ──
  { prefix: "/financial/new", permission: "financial:write" },
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

  { prefix: "/meetings/new", permission: "meetings:write" },
  { prefix: "/meetings", permission: "meetings:read" },
  { prefix: "/calendar", permission: "calendar:read" },
  { prefix: "/officials/new", permission: "officials:write" },
  { prefix: "/officials/*/edit", permission: "officials:write" },
  { prefix: "/officials", permission: "officials:read" },
  { prefix: "/reports", permission: "reports:read" },

  // ── Admin ──
  { prefix: "/admin/users/new", permission: "users:write" },
  { prefix: "/admin/users/*/edit", permission: "users:write" },
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
    .find((r) => matchesPrefix(r.prefix, pathname));

  return match ? match.permission : null;
}

// Segment-wise prefix match. A "*" segment matches any one segment, so the
// rule for residents' edit pages matches /residents/42/edit (and anything
// below it) but not /residents/42 or /residents/42/editor.
function matchesPrefix(prefix: string, pathname: string): boolean {
  const want = prefix.split("/").filter(Boolean);
  const got = pathname.split("/").filter(Boolean);
  if (got.length < want.length) return false;
  return want.every((seg, i) => seg === "*" || seg === got[i]);
}

/**
 * True if `role` may view `pathname`. Paths with no entry in
 * ROUTE_PERMISSIONS (e.g. /account/security, /access-denied) are allowed —
 * they only require being signed in, which middleware checks separately.
 * A missing/unknown role is denied on every gated path.
 */
export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  const required = findRoutePermission(pathname);
  if (required === null) return true;
  if (!role) return false;
  const all = Array.isArray(required) ? required : [required];
  return all.every((perm) => hasPermission(role, perm));
}