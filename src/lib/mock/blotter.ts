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
  hearing_date: string | null; // ISO date
  status: BlotterStatus;
  escalated: boolean;
  created_at: string; // ISO date
  updates: BlotterUpdateMock[];
}

export const MOCK_BLOTTER_CASES: BlotterCaseMock[] = [
  {
    id: 1,
    case_number: "BLT-2026-4821",
    complainant_id: 12,
    complainant_name: "Maria Santos Reyes",
    complainant_contact: "0917-234-5678",
    complainant_address: "Purok II, Brgy. Quisol",
    respondent_id: 45,
    respondent_name: "Ricardo Dela Peña",
    incident_narrative:
      "Complainant alleges that respondent's dog attacked her son while playing near the barangay basketball court, causing minor injuries. Complainant is requesting mediation and reimbursement of medical expenses.",
    incident_date: "2026-06-24",
    hearing_date: "2026-06-29",
    status: "ONGOING",
    escalated: false,
    created_at: "2026-06-25T09:12:00Z",
    updates: [
      {
        id: 101,
        blotter_case_id: 1,
        updated_by: 3,
        updater_name: "secretary_dlrosario",
        notes: "Both parties notified. Hearing scheduled for June 29.",
        new_status: "ONGOING",
        updated_at: "2026-06-25T09:20:00Z",
      },
    ],
  },
  {
    id: 2,
    case_number: "BLT-2026-4809",
    complainant_id: 8,
    complainant_name: "Jose Enrique Castro Sr.",
    complainant_contact: "0928-111-2233",
    complainant_address: "Purok IV, Brgy. Quisol",
    respondent_id: null,
    respondent_name: "Unidentified individual",
    incident_narrative:
      "Complainant reports theft of livestock (2 chickens) from his backyard sometime between 10PM and 5AM. No witnesses identified yet.",
    incident_date: "2026-06-20",
    hearing_date: null,
    status: "FILED",
    escalated: false,
    created_at: "2026-06-21T07:45:00Z",
    updates: [],
  },
  {
    id: 3,
    case_number: "BLT-2026-4790",
    complainant_id: 21,
    complainant_name: "Anna Marie Dungalo",
    complainant_contact: "0917-555-0199",
    complainant_address: "Purok I, Brgy. Quisol",
    respondent_id: 19,
    respondent_name: "Bienvenido Cruz Jr.",
    incident_narrative:
      "Boundary dispute regarding a fence allegedly built 1.5 meters into complainant's property. Respondent disputes the survey markers used.",
    incident_date: "2026-06-10",
    hearing_date: "2026-06-15",
    status: "RESOLVED",
    escalated: false,
    created_at: "2026-06-11T13:05:00Z",
    updates: [
      {
        id: 98,
        blotter_case_id: 3,
        updated_by: 2,
        updater_name: "kagawad_torres",
        notes: "Parties agreed to a boundary line based on the original lot plan. Amicable settlement signed.",
        new_status: "RESOLVED",
        updated_at: "2026-06-15T15:40:00Z",
      },
      {
        id: 95,
        blotter_case_id: 3,
        updated_by: 3,
        updater_name: "secretary_dlrosario",
        notes: "First hearing held. Both parties presented documents. Continuation set.",
        new_status: "ONGOING",
        updated_at: "2026-06-15T10:15:00Z",
      },
    ],
  },
  {
    id: 4,
    case_number: "BLT-2026-4755",
    complainant_id: 33,
    complainant_name: "Charlene S. Asuncion",
    complainant_contact: "0918-777-4432",
    complainant_address: "Street Buwang, Purok II",
    respondent_id: 40,
    respondent_name: "Marlon T. Villareal",
    incident_narrative:
      "Complainant reports repeated verbal harassment and threats from respondent following a dispute over a shared water line. Requests immediate intervention.",
    incident_date: "2026-05-30",
    hearing_date: "2026-06-03",
    status: "ONGOING",
    escalated: true,
    created_at: "2026-05-31T08:00:00Z",
    updates: [
      {
        id: 80,
        blotter_case_id: 4,
        updated_by: 1,
        updater_name: "captain_garcia",
        notes: "Threats deemed to involve possible physical harm. Case elevated to PNP Danao City for further action.",
        new_status: null,
        updated_at: "2026-06-03T16:00:00Z",
      },
    ],
  },
  {
    id: 5,
    case_number: "BLT-2026-4712",
    complainant_id: null,
    complainant_name: "Barangay Tanod Patrol",
    complainant_contact: "0919-000-1122",
    complainant_address: "Barangay Hall",
    respondent_id: 27,
    respondent_name: "Noel P. Ibarra",
    incident_narrative:
      "Noise complaint from neighbors regarding a videoke session past curfew hours (12:30AM). Respondent was advised verbally on-site.",
    incident_date: "2026-06-27",
    hearing_date: null,
    status: "DISMISSED",
    escalated: false,
    created_at: "2026-06-27T02:10:00Z",
    updates: [
      {
        id: 110,
        blotter_case_id: 5,
        updated_by: 3,
        updater_name: "secretary_dlrosario",
        notes: "Respondent apologized and case was settled on the spot. No further action needed.",
        new_status: "DISMISSED",
        updated_at: "2026-06-27T09:00:00Z",
      },
    ],
  },
  {
    id: 6,
    case_number: "BLT-2026-4699",
    complainant_id: 15,
    complainant_name: "Fernando M. Bautista",
    complainant_contact: "0927-303-9911",
    complainant_address: "Purok III, Brgy. Quisol",
    respondent_id: 52,
    respondent_name: "Grace L. Ochoa",
    incident_narrative:
      "Complainant alleges non-payment of a personal loan amounting to ₱15,000, due since March 2026. Requests barangay mediation before pursuing formal collection.",
    incident_date: "2026-06-05",
    hearing_date: "2026-06-08",
    status: "ONGOING",
    escalated: false,
    created_at: "2026-06-06T10:30:00Z",
    updates: [
      {
        id: 90,
        blotter_case_id: 6,
        updated_by: 3,
        updater_name: "secretary_dlrosario",
        notes: "Respondent proposed a 3-month installment plan. Complainant asked for time to consider.",
        new_status: "ONGOING",
        updated_at: "2026-06-08T11:20:00Z",
      },
    ],
  },
];

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