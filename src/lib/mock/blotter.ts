// FILE: src/lib/mock/blotter.ts
// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Blotter UI is being built. Shapes mirror the `BlotterCase` / `BlotterUpdate`
// models in prisma/schema.prisma and the JSON returned by:
//   GET  /api/blotter            → { cases, total, page, limit }
//   GET  /api/blotter/[id]       → BlotterCase & { updates, complainant, respondent }
//   POST /api/blotter            → BlotterCase
//   PATCH /api/blotter/[id]      → BlotterCase
//   POST /api/blotter/[id]/updates → BlotterUpdate
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

export type BlotterStatus = "FILED" | "ONGOING" | "RESOLVED" | "DISMISSED";

export interface BlotterUpdateMock {
  id: number;
  blotter_case_id: number;
  updated_by: number;
  updater_name: string; // stands in for `updater: { username }` from the API include
  notes: string;
  new_status: BlotterStatus | null;
  updated_at: string; // ISO date
}

export interface BlotterCaseMock {
  id: number;
  case_number: string;
  complainant_id: number | null;
  complainant_name: string;
  complainant_contact: string | null;
  complainant_address: string | null;
  respondent_id: number | null;
  respondent_name: string;
  incident_narrative: string;
  incident_date: string; // ISO date
  incident_type: string; // references IncidentType.name
  hearing_date: string | null; // ISO date
  status: BlotterStatus;
  escalated: boolean;
  created_at: string; // ISO date
  updates: BlotterUpdateMock[];
}


// Working-days helper for the "hearing within 3 working days" rule.
export function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function formatISODate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}