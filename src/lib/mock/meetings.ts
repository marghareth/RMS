// FILE: src/lib/mock/meetings.ts
// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Assembly (Meeting Records) UI is being built. Shapes mirror the
// `MeetingRecord` model in prisma/schema.prisma and the JSON returned by:
//   GET   /api/meetings       → { meetings, total, page, limit }
//   GET   /api/meetings/[id]  → MeetingRecord & { recorder }
//   POST  /api/meetings       → MeetingRecord
//   PATCH /api/meetings/[id]  → MeetingRecord
// Note: there is no DELETE /api/meetings/[id] route — meeting records are
// not deletable from the current API, only editable.
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

export type MeetingType = "SB_MEETING" | "BARANGAY_ASSEMBLY";
export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type AgendaItemStatus = "PENDING" | "DISCUSSED" | "APPROVED";

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "SB_MEETING", label: "SB Meeting" },
  { value: "BARANGAY_ASSEMBLY", label: "Barangay Assembly" },
];

export const MEETING_STATUSES: { value: MeetingStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const AGENDA_ITEM_STATUSES: { value: AgendaItemStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "DISCUSSED", label: "Discussed" },
  { value: "APPROVED", label: "Approved" },
];

export function meetingTypeLabel(type: MeetingType) {
  return MEETING_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function meetingStatusLabel(status: MeetingStatus) {
  return MEETING_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function agendaItemStatusLabel(status: AgendaItemStatus) {
  return AGENDA_ITEM_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export interface MeetingRecorderMock {
  id: number;
  username: string;
}

export interface AgendaItemMock {
  id: number;
  meeting_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  status: AgendaItemStatus;
  minutes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingRecordMock {
  id: number;
  meeting_type: MeetingType;
  meeting_date: string; // ISO datetime
  minutes: string | null;
  title: string | null;
  location: string | null;
  status: MeetingStatus;
  recorded_by: number;
  recorder: MeetingRecorderMock;
  created_at: string; // ISO datetime
  agenda_items?: AgendaItemMock[];
  _count?: { agenda_items: number };
}

const SECRETARY: MeetingRecorderMock = { id: 3, username: "secretary_dlrosario" };
const CAPTAIN: MeetingRecorderMock = { id: 1, username: "captain_garcia" };


// ── HELPERS ────────────────────────────────────────────────────────────────

export function formatISODate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatISOTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

export function isUpcoming(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

export function minutesPreview(minutes: string | null, maxLen = 120) {
  if (!minutes) return null;
  const firstLine = minutes.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.length > maxLen ? `${firstLine.slice(0, maxLen)}...` : firstLine;
}