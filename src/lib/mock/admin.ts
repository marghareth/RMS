// FILE: src/lib/mock/admin.ts
// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Admin / Settings UI is being built. Shapes mirror the `SystemSetting`,
// `User`, `AuditLog`, and `Backup` models in prisma/schema.prisma and the
// JSON returned by:
//   GET   /api/settings          → { [key]: value } flattened object
//   PATCH /api/settings          → { [key]: value } (upserted)
//   GET   /api/users             → User[] (id, username, role, is_active, created_at)
//   POST  /api/users             → User
//   GET   /api/users/[id]        → User
//   PATCH /api/users/[id]        → User (role, is_active, password)
//   DELETE /api/users/[id]       → { message } (soft-delete: is_active=false)
//   GET   /api/audit-logs        → { logs, total, page, limit }
//   GET   /api/backup            → Backup[] & { trigger }
//   POST  /api/backup            → Backup
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

export type Role = "ADMIN" | "CAPTAIN" | "SECRETARY" | "KAGAWAD" | "BHW" | "ENCODER";

export const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "CAPTAIN", label: "Barangay Captain" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "KAGAWAD", label: "Kagawad" },
  { value: "BHW", label: "BHW" },
  { value: "ENCODER", label: "Staff / Encoder" },
];

export function roleLabel(role: Role) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

// ── GENERAL SETTINGS (SystemSetting key/value store) ─────────────────────
export interface GeneralSettings {
  barangay_name: string;
  address: string;
  city: string;
  province: string;
  region: string;
  postal_code: string;
  contact_phone: string;
  contact_email: string;
  captain_override_name: string;
  captain_override_position: string;
}


// ── USERS ──────────────────────────────────────────────────────────────────
export interface UserMock {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string; // ISO date
}


// ── AUDIT LOGS ─────────────────────────────────────────────────────────────
export interface AuditLogMock {
  id: number;
  user_id: number;
  user: { id: number; username: string };
  action: string;
  table_affected: string;
  record_id: number | null;
  details: string | null;
  performed_at: string; // ISO datetime
}


export const AUDIT_TABLES = [
  "Resident",
  "Household",
  "Certificate",
  "BlotterCase",
  "MeetingRecord",
  "BrgyOfficial",
  "FinancialRecord",
  "Equipment",
  "User",
  "System",
];

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "DEACTIVATE", "BACKUP"];

// ── BACKUPS ────────────────────────────────────────────────────────────────
export interface BackupMock {
  id: number;
  triggered_by: number;
  trigger: { id: number; username: string };
  backup_date: string; // ISO datetime
  file_reference: string | null;
}


// ── HELPERS ────────────────────────────────────────────────────────────────

export function formatISODate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatISODateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function actionTone(action: string): "green" | "blue" | "red" | "amber" {
  if (action === "CREATE") return "green";
  if (action === "UPDATE") return "blue";
  if (action === "DELETE" || action === "DEACTIVATE") return "red";
  return "amber"; // BACKUP and anything else
}