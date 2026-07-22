// FILE: src/lib/mock/certificates.ts
// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Certificates UI is being built. Shapes mirror the `Certificate` model in
// prisma/schema.prisma and the JSON returned by:
//   GET  /api/certificates          → { certificates, total, page, limit }
//   GET  /api/certificates/[id]     → Certificate & { resident, issuer }
//   POST /api/certificates          → Certificate (or 400/409 error object
//                                      for residency/duplicate checks)
//   PATCH /api/certificates/[id]    → Certificate (purpose only)
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

export type CertificateType =
  | "RESIDENCY"
  | "INDIGENCY"
  | "CLEARANCE"
  | "GOOD_MORAL"
  | "BUSINESS_PERMIT"
  | "COHABITATION"
  | "SOLO_PARENT"
  | "FIRST_TIME_JOB_SEEKER"
  | "LATE_REGISTRATION";

export const CERTIFICATE_TYPES: { value: CertificateType; label: string }[] = [
  { value: "RESIDENCY", label: "Certificate of Residency" },
  { value: "INDIGENCY", label: "Certificate of Indigency" },
  { value: "CLEARANCE", label: "Barangay Clearance" },
  { value: "GOOD_MORAL", label: "Good Moral Character" },
  { value: "BUSINESS_PERMIT", label: "Business Permit Endorsement" },
  { value: "COHABITATION", label: "Certificate of Cohabitation" },
  { value: "SOLO_PARENT", label: "Solo Parent Certification" },
  { value: "FIRST_TIME_JOB_SEEKER", label: "First-Time Job Seeker Certificate" },
  { value: "LATE_REGISTRATION", label: "Late Registration Certificate" },
];

export function certTypeLabel(type: CertificateType) {
  return CERTIFICATE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface CertResidentMock {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string; // ISO date
  sex: string;
  civil_status: string;
  purok: { id: number; name: string } | null;
  household: { id: number; address: string } | null;
  created_at: string; // ISO date — used for the 6-month residency check
}

export interface CertIssuerMock {
  id: number;
  username: string;
  role: string;
}

export interface CertificateMock {
  id: number;
  certificate_no: string;
  resident_id: number | null;
  resident: CertResidentMock | null;
  issued_by: number;
  issuer: CertIssuerMock;
  certificate_type: CertificateType;
  purpose: string;
  issued_at: string; // ISO datetime
  flagged_manual: boolean;
  manual_name: string | null;
  manual_address: string | null;
}

// Stands in for the active Barangay Captain, auto-pulled via BrgyOfficial
// (is_active: true, position: "Barangay Captain") for certificate signatories.
export const MOCK_ACTIVE_CAPTAIN = {
  name: "Pedro C. Barriga Garcia",
  position: "Punong Barangay",
  term: "2023–2026",
};

export const MOCK_BARANGAY_INFO = {
  name: "Barangay Quisol",
  city: "Danao City",
  province: "Cebu",
  region: "Region VII (Central Visayas)",
};

export const MOCK_RESIDENTS_POOL: CertResidentMock[] = [
  {
    id: 12,
    fname: "Maria",
    lname: "Santos",
    mname: "Reyes",
    name_extension: null,
    birthdate: "1985-03-14",
    sex: "FEMALE",
    civil_status: "MARRIED",
    purok: { id: 2, name: "Purok II" },
    household: { id: 200, address: "Purok II, Brgy. Quisol" },
    created_at: "2020-01-10T00:00:00Z",
  },
  {
    id: 8,
    fname: "Jose Enrique",
    lname: "Castro",
    mname: "Barriga",
    name_extension: "Sr.",
    birthdate: "1990-08-01",
    sex: "MALE",
    civil_status: "MARRIED",
    purok: { id: 4, name: "Purok IV" },
    household: { id: 400, address: "Purok IV, Brgy. Quisol" },
    created_at: "2019-06-05T00:00:00Z",
  },
  {
    id: 45,
    fname: "Ricardo",
    lname: "Dela Peña",
    mname: "Suarez",
    name_extension: null,
    birthdate: "1995-10-03",
    sex: "MALE",
    civil_status: "SINGLE",
    purok: { id: 1, name: "Purok I" },
    household: { id: 100, address: "Purok I, Brgy. Quisol" },
    created_at: "2026-05-20T00:00:00Z", // registered <6 months ago — fails residency check
  },
  {
    id: 21,
    fname: "Anna Marie",
    lname: "Dungalo",
    mname: "Pelaez",
    name_extension: null,
    birthdate: "1988-05-14",
    sex: "FEMALE",
    civil_status: "WIDOWED",
    purok: { id: 1, name: "Purok I" },
    household: { id: 100, address: "Purok I, Brgy. Quisol" },
    created_at: "2021-02-18T00:00:00Z",
  },
];

const MOCK_ISSUER: CertIssuerMock = { id: 3, username: "secretary_dlrosario", role: "SECRETARY" };

export const MOCK_CERTIFICATES: CertificateMock[] = [
  {
    id: 1,
    certificate_no: "CERT-2026-1042",
    resident_id: 12,
    resident: MOCK_RESIDENTS_POOL[0],
    issued_by: 3,
    issuer: MOCK_ISSUER,
    certificate_type: "RESIDENCY",
    purpose: "Requirement for school enrollment of dependent",
    issued_at: "2026-06-28T09:15:00Z",
    flagged_manual: false,
    manual_name: null,
    manual_address: null,
  },
  {
    id: 2,
    certificate_no: "CERT-2026-1041",
    resident_id: 8,
    resident: MOCK_RESIDENTS_POOL[1],
    issued_by: 3,
    issuer: MOCK_ISSUER,
    certificate_type: "CLEARANCE",
    purpose: "Local employment application",
    issued_at: "2026-06-27T14:02:00Z",
    flagged_manual: false,
    manual_name: null,
    manual_address: null,
  },
  {
    id: 3,
    certificate_no: "CERT-2026-1040",
    resident_id: null,
    resident: null,
    issued_by: 3,
    issuer: MOCK_ISSUER,
    certificate_type: "INDIGENCY",
    purpose: "Medical assistance request at city hospital",
    issued_at: "2026-06-25T10:40:00Z",
    flagged_manual: true,
    manual_name: "Teresita M. Villanueva",
    manual_address: "Purok III, Brgy. Quisol (walk-in, not yet in RBI)",
  },
  {
    id: 4,
    certificate_no: "CERT-2026-1039",
    resident_id: 21,
    resident: MOCK_RESIDENTS_POOL[3],
    issued_by: 1,
    issuer: { id: 1, username: "captain_garcia", role: "CAPTAIN" },
    certificate_type: "SOLO_PARENT",
    purpose: "Application for solo parent ID at DSWD",
    issued_at: "2026-06-20T08:30:00Z",
    flagged_manual: false,
    manual_name: null,
    manual_address: null,
  },
  {
    id: 5,
    certificate_no: "CERT-2026-1038",
    resident_id: 8,
    resident: MOCK_RESIDENTS_POOL[1],
    issued_by: 3,
    issuer: MOCK_ISSUER,
    certificate_type: "GOOD_MORAL",
    purpose: "College application requirement",
    issued_at: "2026-06-18T11:00:00Z",
    flagged_manual: false,
    manual_name: null,
    manual_address: null,
  },
  {
    id: 6,
    certificate_no: "CERT-2026-1037",
    resident_id: 12,
    resident: MOCK_RESIDENTS_POOL[0],
    issued_by: 3,
    issuer: MOCK_ISSUER,
    certificate_type: "BUSINESS_PERMIT",
    purpose: "Sari-sari store permit renewal endorsement",
    issued_at: "2026-05-30T13:20:00Z",
    flagged_manual: false,
    manual_name: null,
    manual_address: null,
  },
  {
    id: 7,
    certificate_no: "CERT-2026-1036",
    resident_id: null,
    resident: null,
    issued_by: 3,
    issuer: MOCK_ISSUER,
    certificate_type: "FIRST_TIME_JOB_SEEKER",
    purpose: "RA 11261 job application exemption certificate",
    issued_at: "2026-05-22T09:45:00Z",
    flagged_manual: true,
    manual_name: "Kenneth D. Aranas",
    manual_address: "Purok V, Brgy. Quisol (walk-in, not yet in RBI)",
  },
];

// ── HELPERS ────────────────────────────────────────────────────────────────

// Mirrors the server-side 6-month residency check in POST /api/certificates.
export function isEligibleByResidency(resident: CertResidentMock): boolean {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(resident.created_at) <= sixMonthsAgo;
}

// Mirrors the server-side 30-day duplicate-issuance check in POST /api/certificates.
export function findRecentDuplicate(
  certificates: CertificateMock[],
  residentId: number,
  type: CertificateType
): CertificateMock | null {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return (
    certificates.find(
      (c) =>
        c.resident_id === residentId &&
        c.certificate_type === type &&
        new Date(c.issued_at) >= thirtyDaysAgo
    ) ?? null
  );
}

export function residentFullName(r: CertResidentMock) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mi}`;
}

export function formatISODate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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