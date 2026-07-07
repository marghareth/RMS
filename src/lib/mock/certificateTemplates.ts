// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory (localStorage-backed) store standing in for the new
// `CertificateTemplate` Prisma model while templating is being built. Mirrors
// the JSON that will eventually come from:
//   GET   /api/certificate-templates          → CertificateTemplate[]
//   GET   /api/certificate-templates/[type]   → CertificateTemplate
//   PATCH /api/certificate-templates/[type]   → CertificateTemplate (upsert)
//   POST  /api/certificate-templates/[type]/reset → CertificateTemplate (defaults restored)
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

import { CertificateType, CERTIFICATE_TYPES } from "@/lib/mock/certificates";

export interface CertificateTemplateMock {
  certificate_type: CertificateType;
  title: string;
  body: string;
  closing_line: string;
  updated_at: string; // ISO datetime
  updated_by: string | null; // username, null if never edited from default
}

// Available placeholder tokens, interpolated at preview/print time.
export const TEMPLATE_PLACEHOLDERS: { token: string; description: string }[] = [
  { token: "{{full_name}}", description: "Applicant's full name (uppercase)" },
  { token: "{{address}}", description: "Applicant's address" },
  { token: "{{purpose}}", description: "Purpose entered when the certificate was issued" },
  { token: "{{captain_name}}", description: "Active Barangay Captain's name" },
  { token: "{{captain_position}}", description: "Active Captain's position title" },
  { token: "{{barangay_name}}", description: "Barangay name" },
  { token: "{{city}}", description: "City / Municipality" },
  { token: "{{province}}", description: "Province" },
  { token: "{{date_issued}}", description: "Date the certificate was issued" },
];

// Extracted from the previous hardcoded `certificateBody()` switch-case, now
// editable per type instead of living in code.
const DEFAULT_TEMPLATES: Record<CertificateType, { title: string; body: string; closing_line: string }> = {
  RESIDENCY: {
    title: "Certificate of Residency",
    body: "This is to certify that {{full_name}}, of legal age, is a bona fide resident of {{address}}, and has resided therein for the required period under barangay records.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  INDIGENCY: {
    title: "Certificate of Indigency",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, belongs to an indigent family in this barangay, based on records and assessment on file with this office.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  CLEARANCE: {
    title: "Barangay Clearance",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, has no derogatory record on file with this barangay as of the date of issuance.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  GOOD_MORAL: {
    title: "Good Moral Character",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, is known to this office to be of good moral character and has no record of any misconduct.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  BUSINESS_PERMIT: {
    title: "Business Permit Endorsement",
    body: "This is to certify that the business operated by {{full_name}}, located at {{address}}, is endorsed by this barangay for the purpose of securing a business permit.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  COHABITATION: {
    title: "Certificate of Cohabitation",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, is known to this office to be cohabiting with their partner as verified by barangay records.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  SOLO_PARENT: {
    title: "Solo Parent Certification",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, is a solo parent as defined under RA 8972, based on records on file with this barangay.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  FIRST_TIME_JOB_SEEKER: {
    title: "First-Time Job Seeker Certificate",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, is a first-time job seeker under RA 11261 (First Time Jobseekers Assistance Act) and is availing of the exemption granted therein.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
  LATE_REGISTRATION: {
    title: "Late Registration Certificate",
    body: "This is to certify that {{full_name}}, a resident of {{address}}, is undergoing late registration of civil documents and is endorsed by this barangay for the purpose stated.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}.",
  },
};

const STORAGE_KEY = "rms-mock-certificate-templates";

function createInitialTemplates(): CertificateTemplateMock[] {
  return CERTIFICATE_TYPES.map((t) => ({
    certificate_type: t.value,
    title: DEFAULT_TEMPLATES[t.value].title,
    body: DEFAULT_TEMPLATES[t.value].body,
    closing_line: DEFAULT_TEMPLATES[t.value].closing_line,
    updated_at: new Date(0).toISOString(),
    updated_by: null,
  }));
}

export const initialMockTemplates = createInitialTemplates();

function persistTemplates(templates: CertificateTemplateMock[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function readTemplatesFromStorage(): CertificateTemplateMock[] {
  if (typeof window === "undefined") return initialMockTemplates;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      persistTemplates(initialMockTemplates);
      return initialMockTemplates;
    }
    const parsed = JSON.parse(raw) as CertificateTemplateMock[];
    // Guard against a stale shape missing newly-added certificate types.
    const missing = CERTIFICATE_TYPES.filter((t) => !parsed.some((p) => p.certificate_type === t.value)).map(
      (t) => ({
        certificate_type: t.value,
        title: DEFAULT_TEMPLATES[t.value].title,
        body: DEFAULT_TEMPLATES[t.value].body,
        closing_line: DEFAULT_TEMPLATES[t.value].closing_line,
        updated_at: new Date(0).toISOString(),
        updated_by: null,
      })
    );
    return missing.length > 0 ? [...parsed, ...missing] : parsed;
  } catch {
    return initialMockTemplates;
  }
}

export function getMockTemplates(): CertificateTemplateMock[] {
  return readTemplatesFromStorage();
}

export function getMockTemplate(type: CertificateType): CertificateTemplateMock {
  const templates = getMockTemplates();
  return templates.find((t) => t.certificate_type === type) ?? {
    certificate_type: type,
    title: DEFAULT_TEMPLATES[type].title,
    body: DEFAULT_TEMPLATES[type].body,
    closing_line: DEFAULT_TEMPLATES[type].closing_line,
    updated_at: new Date(0).toISOString(),
    updated_by: null,
  };
}

export function updateMockTemplate(
  type: CertificateType,
  updates: Partial<Pick<CertificateTemplateMock, "title" | "body" | "closing_line">>,
  updatedBy = "you"
) {
  const templates = getMockTemplates();
  const next = templates.map((t) =>
    t.certificate_type === type
      ? { ...t, ...updates, updated_at: new Date().toISOString(), updated_by: updatedBy }
      : t
  );
  persistTemplates(next);
  return next.find((t) => t.certificate_type === type)!;
}

export function resetMockTemplate(type: CertificateType) {
  const templates = getMockTemplates();
  const defaults = DEFAULT_TEMPLATES[type];
  const next = templates.map((t) =>
    t.certificate_type === type
      ? { ...t, title: defaults.title, body: defaults.body, closing_line: defaults.closing_line, updated_at: new Date(0).toISOString(), updated_by: null }
      : t
  );
  persistTemplates(next);
  return next.find((t) => t.certificate_type === type)!;
}

// Interpolates {{token}} placeholders in a template string with real values.
export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);
}