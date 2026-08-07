// ─── ROLE-BASED PERMISSION MATRIX ─────────────────────────────────────────────
// Maps every role to the permissions it holds.
// Permission strings follow the pattern: "resource:action"
// Actions: read | write | delete | admin

type Role = "ADMIN" | "CAPTAIN" | "SECRETARY" | "KAGAWAD" | "BHW" | "ENCODER";

const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ["*"], // full access

  CAPTAIN: [
    "dashboard:read",
    "residents:read", "residents:write",
    "households:read", "households:write",
    "certificates:read", "certificates:write",
    "blotter:read", "blotter:write",
    "officials:read", "officials:write",
    "registries:read", "registries:write",
    "health:read", "health:write",
    "financial:read", "financial:write",
    "equipment:read", "equipment:write",
    "assets:read", "assets:write",
    "meetings:read", "meetings:write",
    "reports:read",
    "barangay_id:read", "barangay_id:write",
    "settings:read", "settings:write",
    "users:read",
    "audit-logs:read",
    "visitors:read", "visitors:write",
    "deceased:read", "deceased:write",
    "calendar:read", "calendar:write",
    "fund-sources:read", "fund-sources:write",
    "appropriations:read", "appropriations:write",
    "revenues:read", "revenues:write",
    "disbursements:read", "disbursements:write",
    "incident-types:read", "incident-types:write",
    "dashboard-preferences:read", "dashboard-preferences:write",
  ],

  SECRETARY: [
    "dashboard:read",
    "residents:read", "residents:write",
    "households:read", "households:write",
    "certificates:read", "certificates:write",
    "blotter:read", "blotter:write",
    "officials:read",
    "registries:read", "registries:write",
    "health:read",
    "financial:read", "financial:write",
    "equipment:read", "equipment:write",
    "assets:read", "assets:write",
    "meetings:read", "meetings:write",
    "reports:read",
    "barangay_id:read", "barangay_id:write",
    "visitors:read", "visitors:write",
    "deceased:read", "deceased:write",
    "calendar:read", "calendar:write",
    "fund-sources:read", "fund-sources:write",
    "appropriations:read", "appropriations:write",
    "revenues:read", "revenues:write",
    "disbursements:read", "disbursements:write",
    "incident-types:read",
    "dashboard-preferences:read", "dashboard-preferences:write",
  ],

  KAGAWAD: [
    "dashboard:read",
    "residents:read",
    "households:read",
    "certificates:read",
    "blotter:read", "blotter:write",
    "officials:read",
    "registries:read",
    "health:read",
    "financial:read",
    "equipment:read",
    "assets:read",
    "meetings:read",
    "reports:read",
    "barangay_id:read",
    "visitors:read",
    "deceased:read",
    "calendar:read", "calendar:write",
    "fund-sources:read",
    "appropriations:read",
    "revenues:read",
    "disbursements:read",
    "incident-types:read",
    "dashboard-preferences:read", "dashboard-preferences:write",
  ],

  BHW: [
    "dashboard:read",
    "residents:read",
    "households:read",
    "registries:read", "registries:write",
    "health:read", "health:write",
    "barangay_id:read",
    "visitors:read", "visitors:write",
    "deceased:read",
    "calendar:read",
    "dashboard-preferences:read", "dashboard-preferences:write",
  ],

  ENCODER: [
    "dashboard:read",
    "residents:read", "residents:write",
    "households:read", "households:write",
    "certificates:read", "certificates:write",
    "blotter:read",
    "registries:read",
    "health:read",
    "equipment:read",
    "assets:read",
    "barangay_id:read", "barangay_id:write",
    // Front-desk staff need Visitor Log daily — granted broadly per spec 2.1.
    "visitors:read", "visitors:write",
    "deceased:read", "deceased:write",
    "calendar:read",
    "incident-types:read",
    "dashboard-preferences:read", "dashboard-preferences:write",
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const rolePerms = PERMISSIONS[role as Role];
  if (!rolePerms) return false;
  // ADMIN wildcard
  if (rolePerms.includes("*")) return true;
  // Exact match
  if (rolePerms.includes(permission)) return true;
  // Wildcard resource match: "residents:*" covers "residents:read"
  const [resource] = permission.split(":");
  if (rolePerms.includes(`${resource}:*`)) return true;
  return false;
}