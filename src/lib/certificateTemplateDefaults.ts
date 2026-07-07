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

export const DEFAULT_CERTIFICATE_TEMPLATES: Record<
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