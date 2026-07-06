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
    "meetings:read", "meetings:write",
    "reports:read",
    "barangay_id:read", "barangay_id:write",
    "settings:read",
    "users:read",
    "audit-logs:read",
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
    "meetings:read", "meetings:write",
    "reports:read",
    "barangay_id:read", "barangay_id:write",
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
    "meetings:read",
    "reports:read",
    "barangay_id:read",
  ],

  BHW: [
    "dashboard:read",
    "residents:read",
    "households:read",
    "registries:read", "registries:write",
    "health:read", "health:write",
    "barangay_id:read",
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
    "barangay_id:read", "barangay_id:write",
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