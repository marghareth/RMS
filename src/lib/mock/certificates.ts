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

export type RequestStatus = "PENDING" | "PROCESSING" | "RELEASED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "WAIVED";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  RELEASED: "Released",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Unpaid",
  PAID: "Paid",
  WAIVED: "Waived",
};

export interface CertificateMock {
  id: number;
  certificate_no: string;
  queue_number: string;
  resident_id: number | null;
  resident: CertResidentMock | null;
  issued_by: number;
  issuer: CertIssuerMock;
  certificate_type: CertificateType;
  purpose: string;
  requested_at: string; // ISO datetime — always set, the moment the request was filed
  issued_at: string | null; // ISO datetime — only set once status becomes RELEASED
  status: RequestStatus;
  payment_status: PaymentStatus;
  flagged_manual: boolean;
  manual_name: string | null;
  manual_address: string | null;
  // Per-document correction of the printed name/address — see the schema
  // comment on Certificate.override_full_name. Optional on the type so
  // older mock data / callers that predate it still compile.
  override_full_name?: string | null;
  override_address?: string | null;
}




const MOCK_ISSUER: CertIssuerMock = { id: 3, username: "secretary_dlrosario", role: "SECRETARY" };


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
        new Date(c.requested_at) >= thirtyDaysAgo
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

export function formatISODateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Falls back to `requested_at` when a request hasn't been RELEASED yet (so
// `issued_at` is still null) — used anywhere the UI wants "the most relevant
// date for this record" without caring which lifecycle stage produced it.
export function certDisplayDate(c: Pick<CertificateMock, "issued_at" | "requested_at">) {
  return c.issued_at ?? c.requested_at;
}