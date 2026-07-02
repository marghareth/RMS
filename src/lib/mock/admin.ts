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
  contact_phone: string;
  contact_email: string;
  captain_override_name: string;
  captain_override_position: string;
}

export const MOCK_SETTINGS: GeneralSettings = {
  barangay_name: "Barangay Quisol",
  address: "Street Poblacion, Purok III",
  city: "Danao City",
  province: "Cebu",
  region: "Region VII (Central Visayas)",
  contact_phone: "0917-000-1122",
  contact_email: "brgy.quisol@danaocity.gov.ph",
  captain_override_name: "",
  captain_override_position: "Punong Barangay",
};

// ── USERS ──────────────────────────────────────────────────────────────────
export interface UserMock {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string; // ISO date
}

export const MOCK_USERS: UserMock[] = [
  { id: 1, username: "captain_garcia", role: "CAPTAIN", is_active: true, created_at: "2023-11-01T08:00:00Z" },
  { id: 2, username: "kagawad_torres", role: "KAGAWAD", is_active: true, created_at: "2023-11-01T08:05:00Z" },
  { id: 3, username: "secretary_dlrosario", role: "SECRETARY", is_active: true, created_at: "2023-11-02T09:15:00Z" },
  { id: 4, username: "treasurer_amayo", role: "ENCODER", is_active: true, created_at: "2023-11-02T09:20:00Z" },
  { id: 5, username: "bhw_santos", role: "BHW", is_active: true, created_at: "2024-01-15T10:00:00Z" },
  { id: 6, username: "admin_root", role: "ADMIN", is_active: true, created_at: "2023-10-20T07:00:00Z" },
  { id: 7, username: "encoder_reyes", role: "ENCODER", is_active: false, created_at: "2024-03-10T11:30:00Z" },
];

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

export const MOCK_AUDIT_LOGS: AuditLogMock[] = [
  {
    id: 501,
    user_id: 3,
    user: { id: 3, username: "secretary_dlrosario" },
    action: "CREATE",
    table_affected: "Certificate",
    record_id: 1,
    details: "Issued RESIDENCY certificate for resident #12",
    performed_at: "2026-06-28T09:15:00Z",
  },
  {
    id: 500,
    user_id: 4,
    user: { id: 4, username: "treasurer_amayo" },
    action: "CREATE",
    table_affected: "FinancialRecord",
    record_id: 1,
    details: "Recorded INCOME transaction of ₱15,000.00",
    performed_at: "2026-06-28T09:00:00Z",
  },
  {
    id: 499,
    user_id: 1,
    user: { id: 1, username: "captain_garcia" },
    action: "UPDATE",
    table_affected: "BlotterCase",
    record_id: 4,
    details: "Escalated case BLT-2026-4755 to PNP Danao City",
    performed_at: "2026-06-27T16:00:00Z",
  },
  {
    id: 498,
    user_id: 3,
    user: { id: 3, username: "secretary_dlrosario" },
    action: "UPDATE",
    table_affected: "MeetingRecord",
    record_id: 1,
    details: "Added minutes for SB Meeting on 2026-06-29",
    performed_at: "2026-06-29T16:30:00Z",
  },
  {
    id: 497,
    user_id: 6,
    user: { id: 6, username: "admin_root" },
    action: "CREATE",
    table_affected: "User",
    record_id: 7,
    details: "Created user: encoder_reyes with role: ENCODER",
    performed_at: "2024-03-10T11:30:00Z",
  },
  {
    id: 496,
    user_id: 6,
    user: { id: 6, username: "admin_root" },
    action: "DEACTIVATE",
    table_affected: "User",
    record_id: 7,
    details: "Deactivated user ID: 7",
    performed_at: "2026-06-01T08:20:00Z",
  },
  {
    id: 495,
    user_id: 3,
    user: { id: 3, username: "secretary_dlrosario" },
    action: "CREATE",
    table_affected: "BlotterCase",
    record_id: 1,
    details: "Filed new blotter case BLT-2026-4821",
    performed_at: "2026-06-25T09:12:00Z",
  },
  {
    id: 494,
    user_id: 4,
    user: { id: 4, username: "treasurer_amayo" },
    action: "CREATE",
    table_affected: "FinancialRecord",
    record_id: 4,
    details: "Recorded EXPENSE transaction of ₱1,450.00",
    performed_at: "2026-06-24T10:15:00Z",
  },
  {
    id: 493,
    user_id: 1,
    user: { id: 1, username: "captain_garcia" },
    action: "BACKUP",
    table_affected: "System",
    record_id: 12,
    details: "Manual backup triggered",
    performed_at: "2026-06-20T18:00:00Z",
  },
  {
    id: 492,
    user_id: 3,
    user: { id: 3, username: "secretary_dlrosario" },
    action: "UPDATE",
    table_affected: "Resident",
    record_id: 45,
    details: "Updated contact information for resident #45",
    performed_at: "2026-06-19T14:20:00Z",
  },
];

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

export const MOCK_BACKUPS: BackupMock[] = [
  {
    id: 12,
    triggered_by: 1,
    trigger: { id: 1, username: "captain_garcia" },
    backup_date: "2026-06-20T18:00:00Z",
    file_reference: "backup-1750442400000.sql",
  },
  {
    id: 11,
    triggered_by: 6,
    trigger: { id: 6, username: "admin_root" },
    backup_date: "2026-06-13T18:00:00Z",
    file_reference: "backup-1749837600000.sql",
  },
  {
    id: 10,
    triggered_by: 6,
    trigger: { id: 6, username: "admin_root" },
    backup_date: "2026-06-06T18:00:00Z",
    file_reference: "backup-1749232800000.sql",
  },
  {
    id: 9,
    triggered_by: 1,
    trigger: { id: 1, username: "captain_garcia" },
    backup_date: "2026-05-30T18:00:00Z",
    file_reference: "backup-1748628000000.sql",
  },
];

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