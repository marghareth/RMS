// FILE: src/lib/certificateTemplateDefaults.ts
// Server-side default certificate template content, used to auto-seed the
// `CertificateTemplate` table for any certificate type that doesn't have a
// row yet. Mirrors prisma's `CertificateType` enum exactly.

export const CERTIFICATE_TYPE_VALUES = [
  "RESIDENCY",
  "INDIGENCY",
  "CLEARANCE",
  "GOOD_MORAL",
  "BUSINESS_PERMIT",
  "COHABITATION",
  "SOLO_PARENT",
  "FIRST_TIME_JOB_SEEKER",
  "LATE_REGISTRATION",
] as const;

export type CertificateTypeValue = (typeof CERTIFICATE_TYPE_VALUES)[number];

// Nov 2026 (first pass): the wording states the person's age, civil status
// and citizenship ({{person_details}}, e.g. "34 years old, married,
// Filipino") and the long-form issue date ("4th day of November, 2026").
// Kept so templates seeded with it upgrade to the current wording below.
const DEFAULTS_2026_11A: Record<
  CertificateTypeValue,
  { title: string; body: string; closing_line: string }
> = {
  RESIDENCY: {
    title: "Certificate of Residency",
    body: "This is to certify that {{full_name}}, {{person_details}}, is a bona fide resident of {{address}}, and has been residing in this barangay since {{resident_since}}.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  INDIGENCY: {
    title: "Certificate of Indigency",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, belongs to an indigent family in this barangay, based on the records and assessment on file with this office.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  CLEARANCE: {
    title: "Barangay Clearance",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, has no derogatory record on file with this barangay as of the date of issuance.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  GOOD_MORAL: {
    title: "Certificate of Good Moral Character",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, is known to this office to be of good moral character and a law-abiding citizen, and has no record of any misconduct in this barangay.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  BUSINESS_PERMIT: {
    title: "Barangay Business Clearance",
    body: "This is to certify that the business operated by {{full_name}}, {{person_details}}, located at {{address}}, has complied with the requirements of this barangay and is hereby endorsed for the purpose of securing a business permit.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  COHABITATION: {
    title: "Certificate of Cohabitation",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, is known to this office to be living together with their partner as husband and wife, as verified by barangay records.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  SOLO_PARENT: {
    title: "Solo Parent Certification",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, is a solo parent as defined under Republic Act No. 11861 (Expanded Solo Parents Welfare Act), based on the records on file with this barangay.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  FIRST_TIME_JOB_SEEKER: {
    title: "First-Time Job Seeker Certification",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, is a first-time job seeker as defined under Republic Act No. 11261 (First Time Jobseekers Assistance Act), and is entitled to the benefits granted therein. This certification may be used only once.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
  LATE_REGISTRATION: {
    title: "Certificate for Late Registration",
    body: "This is to certify that {{full_name}}, {{person_details}}, a resident of {{address}}, is personally known to this office, and this certification is issued in support of the late registration of their civil documents.",
    closing_line: "Issued this {{date_issued}} at the Barangay Hall of {{barangay_name}}, {{city}}, {{province}}, Philippines.",
  },
};

// Current defaults (Nov 2026), worded like the standard barangay clearance:
// the body, then "ISSUED this 4th day of November, 2026 at Barangay …, upon
// the request of the interested party for … and for whatever legal purpose
// it may serve." A blank line in a body starts a new paragraph.
// Templates nobody ever edited are upgraded automatically
// (upgradeLegacyTemplate); edited templates are left alone.
const CLOSING =
  "ISSUED this {{date_issued}} at {{barangay_name}}, {{city}}, {{province}}, upon the request of the interested party for {{purpose}} and for whatever legal purpose it may serve.";

export const DEFAULT_CERTIFICATE_TEMPLATES: Record<
  CertificateTypeValue,
  { title: string; body: string; closing_line: string }
> = Object.fromEntries(
  Object.entries(DEFAULTS_2026_11A).map(([type, t]) => [
    type,
    {
      title: t.title,
      body:
        type === "CLEARANCE"
          ? "This is to certify that {{full_name}}, {{person_details}}, and a resident of {{address}}, is known to be of good moral character and a law-abiding citizen in the community.\n\nTo certify further, that {{he_she}} has no derogatory and/or criminal records filed in this barangay."
          : t.body,
      closing_line: CLOSING,
    },
  ])
) as Record<CertificateTypeValue, { title: string; body: string; closing_line: string }>;

const LEGACY_DEFAULTS_2026_09: Record<
  CertificateTypeValue,
  { title: string; body: string; closing_line: string }
> = {
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

/**
 * A stored template that still has an earlier default's exact wording
 * (never edited) gets the current default; anything an admin changed is kept.
 */
export function upgradeLegacyTemplate<T extends { title: string; body: string; closing_line: string | null }>(
  type: string,
  template: T
): T {
  const current = DEFAULT_CERTIFICATE_TEMPLATES[type as CertificateTypeValue];
  if (!current) return template;
  const untouched = [LEGACY_DEFAULTS_2026_09, DEFAULTS_2026_11A].some((set) => {
    const old = set[type as CertificateTypeValue];
    return old && template.title === old.title && template.body === old.body && (template.closing_line ?? "") === old.closing_line;
  });
  return untouched ? { ...template, ...current } : template;
}