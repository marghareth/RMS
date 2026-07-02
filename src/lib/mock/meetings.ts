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

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "SB_MEETING", label: "SB Meeting" },
  { value: "BARANGAY_ASSEMBLY", label: "Barangay Assembly" },
];

export function meetingTypeLabel(type: MeetingType) {
  return MEETING_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface MeetingRecorderMock {
  id: number;
  username: string;
}

export interface MeetingRecordMock {
  id: number;
  meeting_type: MeetingType;
  meeting_date: string; // ISO datetime
  minutes: string | null;
  recorded_by: number;
  recorder: MeetingRecorderMock;
  created_at: string; // ISO datetime
}

const SECRETARY: MeetingRecorderMock = { id: 3, username: "secretary_dlrosario" };
const CAPTAIN: MeetingRecorderMock = { id: 1, username: "captain_garcia" };

export const MOCK_MEETINGS: MeetingRecordMock[] = [
  {
    id: 1,
    meeting_type: "SB_MEETING",
    meeting_date: "2026-06-29T14:00:00Z",
    minutes:
      "Attendance: 7/7 SB members present.\n\nAgenda:\n1. Review of Q2 barangay budget utilization\n2. Approval of resolution for CCTV installation at the covered court\n3. Update on ongoing road repair project (Purok III)\n\nResolutions:\n- Resolution No. 2026-014: Approved the installation of 4 CCTV units at the covered court, budget of ₱45,000 from the 20% development fund.\n- Road repair project is 60% complete, expected finish by mid-July.\n\nNext meeting: July 13, 2026, 2:00 PM.",
    recorded_by: 3,
    recorder: SECRETARY,
    created_at: "2026-06-29T16:30:00Z",
  },
  {
    id: 2,
    meeting_type: "BARANGAY_ASSEMBLY",
    meeting_date: "2026-06-15T09:00:00Z",
    minutes:
      "Attendance: Approximately 180 residents present.\n\nAgenda:\n1. Presentation of 2026 mid-year accomplishment report\n2. Open forum on garbage collection schedule concerns\n3. Announcement of upcoming medical mission (July 2026)\n\nHighlights:\n- Residents raised concerns about irregular garbage collection in Purok I and IV. Barangay Captain committed to coordinating with the city ENRO office.\n- Medical mission confirmed for July 18, 2026 in partnership with the City Health Office.\n\nNo formal resolutions passed; open forum notes filed separately.",
    recorded_by: 3,
    recorder: SECRETARY,
    created_at: "2026-06-15T11:00:00Z",
  },
  {
    id: 3,
    meeting_type: "SB_MEETING",
    meeting_date: "2026-05-25T14:00:00Z",
    minutes:
      "Attendance: 6/7 SB members present (Kagawad Reyes on leave).\n\nAgenda:\n1. Review of blotter case escalation policy\n2. Budget allocation for June barangay assembly\n3. Endorsement of business permits (3 applications)\n\nResolutions:\n- Resolution No. 2026-013: Adopted updated guidelines for escalating blotter cases involving threats of physical harm to PNP Danao City.\n- Approved ₱8,000 budget for June assembly logistics.\n- All 3 business permit endorsements approved.",
    recorded_by: 1,
    recorder: CAPTAIN,
    created_at: "2026-05-25T16:00:00Z",
  },
  {
    id: 4,
    meeting_type: "BARANGAY_ASSEMBLY",
    meeting_date: "2026-03-08T09:00:00Z",
    minutes:
      "Attendance: Approximately 210 residents present.\n\nAgenda:\n1. Presentation of 2025 annual accomplishment report\n2. Election of new Purok leaders (Purok II and V)\n3. Distribution of 4Ps program updates\n\nHighlights:\n- New Purok Leader for Purok II: Fernando Bautista.\n- New Purok Leader for Purok V: Grace Ochoa.\n- DSWD representative gave updates on 4Ps beneficiary re-validation schedule.",
    recorded_by: 3,
    recorder: SECRETARY,
    created_at: "2026-03-08T12:00:00Z",
  },
  {
    id: 5,
    meeting_type: "SB_MEETING",
    meeting_date: "2026-07-13T14:00:00Z",
    minutes: null, // upcoming meeting — minutes not yet encoded
    recorded_by: 3,
    recorder: SECRETARY,
    created_at: "2026-06-29T16:31:00Z",
  },
];

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