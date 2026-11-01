// FILE: src/lib/permission.ts
//
// ─── ROLE-BASED PERMISSION MATRIX ─────────────────────────────────────────────
// Maps every role to the permissions it holds.
// Permission strings follow the pattern "resource:action", where action is
//   read    — view the module
//   write   — add and edit records
//   delete  — delete, archive or cancel records (separate from write, so being
//             able to edit a module no longer means being able to delete in it)
//
// ACCESS POLICY (approved by the barangay, Nov 2026):
//   ADMIN, SECRETARY  full access — add, edit, delete everything, plus user
//                     accounts, system settings and database backups.
//   ENCODER           add/edit residents, households, certificates, Barangay ID
//                     and the visitor log; view the rest of its modules. No deleting.
//   BHW               add/edit health records and vaccinations; view the rest of
//                     its modules. No deleting.
//   CAPTAIN, KAGAWAD  view only. The Captain can also view user accounts,
//                     settings and the audit log (oversight).
//
// WHAT EACH ROLE CAN SEE is unchanged from before this policy: it only took
// away editing. In particular the BHW still cannot see blotter cases,
// certificates, finances, equipment or meetings, and the Encoder still cannot
// see finances, meetings, officials or reports.
// Everyone can still customise their OWN dashboard layout
// (dashboard-preferences), which changes no barangay record.
//
// This module is the single source of truth for both the API
// (requirePermission in src/lib/session.ts) and the screens (useCan in
// src/lib/hooks/useCan.ts), and runs on the Edge runtime too (middleware), so
// it must stay dependency-free.

export type Role = "ADMIN" | "CAPTAIN" | "SECRETARY" | "KAGAWAD" | "BHW" | "ENCODER";

/** Read access to every operational module (not users, settings, audit log or backups).
 *  Captain and Kagawad see all of these; BHW and Encoder see subsets below. */
const VIEW_ALL = [
  "dashboard:read",
  "residents:read",
  "households:read",
  "deceased:read",
  "registries:read",
  "certificates:read",
  "barangay_id:read",
  "blotter:read",
  "incident-types:read",
  "health:read",
  "equipment:read",
  "assets:read",
  "financial:read",
  "fund-sources:read",
  "appropriations:read",
  "revenues:read",
  "disbursements:read",
  "meetings:read",
  "calendar:read",
  "officials:read",
  "visitors:read",
  "reports:read",
] as const;

/** Every user manages their own dashboard layout. */
const OWN_DASHBOARD = ["dashboard-preferences:read", "dashboard-preferences:write"] as const;

const PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN: ["*"],
  SECRETARY: ["*"],

  CAPTAIN: [
    ...VIEW_ALL,
    ...OWN_DASHBOARD,
    // Oversight: can look, not change.
    "users:read",
    "settings:read",
    "audit-logs:read",
  ],

  KAGAWAD: [...VIEW_ALL, ...OWN_DASHBOARD],

  BHW: [
    "dashboard:read",
    "residents:read",
    "households:read",
    "deceased:read",
    "registries:read",
    "health:read",
    "barangay_id:read",
    "visitors:read",
    "calendar:read",
    ...OWN_DASHBOARD,
    "health:write",
  ],

  ENCODER: [
    "dashboard:read",
    "residents:read",
    "households:read",
    "deceased:read",
    "registries:read",
    "certificates:read",
    "barangay_id:read",
    "blotter:read",
    "incident-types:read",
    "health:read",
    "equipment:read",
    "assets:read",
    "visitors:read",
    "calendar:read",
    ...OWN_DASHBOARD,
    "residents:write",
    "households:write",
    "certificates:write",
    "barangay_id:write",
    "visitors:write",
  ],
};

export const ROLES = Object.keys(PERMISSIONS) as Role[];

export function hasPermission(role: string, permission: string): boolean {
  const rolePerms = PERMISSIONS[role as Role];
  if (!rolePerms) return false;
  // Full-access wildcard
  if (rolePerms.includes("*")) return true;
  // Exact match
  if (rolePerms.includes(permission)) return true;
  // Wildcard resource match: "residents:*" covers "residents:read"
  const [resource] = permission.split(":");
  if (rolePerms.includes(`${resource}:*`)) return true;
  return false;
}

/** True when the role can only view (no add/edit/delete anywhere except its own dashboard). */
export function isViewOnly(role: string): boolean {
  const rolePerms = PERMISSIONS[role as Role];
  if (!rolePerms) return true;
  if (rolePerms.includes("*")) return false;
  return !rolePerms.some((p) => !p.startsWith("dashboard-preferences:") && (p.endsWith(":write") || p.endsWith(":delete") || p.endsWith(":*")));
}