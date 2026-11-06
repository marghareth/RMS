// FILE: src/lib/pdf/buildCertificatePdfProps.ts
//
// Shared between GET /api/pdf/certificate/[id] (one certificate) and
// GET /api/pdf/certificate/bulk (many, one PDF) so the name-formatting,
// address fallback, template interpolation, and QR generation logic lives
// in exactly one place.
//
// Nov 2026:
//   - Fills the details a barangay certificate normally states: age, civil
//     status, citizenship ({{person_details}}), purok, resident since, and
//     the long-form issue date ("4th day of November, 2026").
//   - Loads the letterhead (logos, officials column) from getLetterhead().
//   - BUGFIX: the "Correct Name / Address" fix (override_full_name /
//     override_address) only changed the on-screen preview; the PDF kept
//     printing the original spelling. It's used here now.

import QRCode from "qrcode";
import { renderTemplate } from "@/lib/mock/certificateTemplates";
import { getLetterhead, type LetterheadOfficial } from "@/lib/barangay-info";
import { upgradeLegacyTemplate } from "@/lib/certificateTemplateDefaults";

// Structural types rather than importing Prisma's generated types directly —
// keeps this helper decoupled from exactly which fields a given `include`
// pulled in, as long as the shape matches.
export interface CertificateForPdf {
  id: number;
  certificate_no: string;
  certificate_type: string;
  purpose: string;
  issued_at: Date | string | null;
  requested_at?: Date | string | null;
  queue_number?: string | null;
  payment_status?: string | null;
  flagged_manual: boolean;
  manual_name: string | null;
  manual_address: string | null;
  override_full_name?: string | null;
  override_address?: string | null;
  verification_code: string;
  resident: {
    fname: string;
    lname: string;
    mname: string | null;
    name_extension: string | null;
    birthdate?: Date | string | null;
    sex?: string | null;
    civil_status?: string | null;
    citizenship?: string | null;
    residency_start_date?: Date | string | null;
    purok?: { name: string } | null;
    household: { address: string } | null;
  } | null;
}

export interface TemplateForPdf {
  title: string;
  body: string;
  closing_line: string | null;
}

export interface CertificatePdfPropsResult {
  title: string;
  body: string;
  closing: string;
  purpose: string;
  certificateNo: string;
  queueNumber: string;
  applicantName: string;
  bodyName: string;
  flaggedManual: boolean;
  captainName: string;
  captainPosition: string;
  barangayName: string;
  city: string;
  province: string;
  region: string;
  barangayAddress: string;
  barangayContact: string;
  officials: LetterheadOfficial[];
  logoBarangay?: string;
  logoCity?: string;
  /** "Municipality of Sto. Domingo" / "Danao City", for the letterhead. */
  cityLine: string;
  /** "November 4, 2026" once released; empty while still pending. */
  dateIssued: string;
  /** "Valid for six (6) months…" for the documents that usually expire, otherwise empty. */
  validityNote: string;
  paid: boolean;
  qrDataUrl?: string;
}

const CIVIL: Record<string, string> = {
  SINGLE: "single",
  MARRIED: "married",
  WIDOWED: "widowed",
  SEPARATED: "separated",
  LIVE_IN: "living in",
};

/** Certificates that are customarily valid for six months. */
const EXPIRES = new Set(["CLEARANCE", "RESIDENCY", "INDIGENCY", "GOOD_MORAL", "BUSINESS_PERMIT"]);

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "4th day of November, 2026" in Philippine time. */
export function longIssueDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", day: "numeric", month: "long", year: "numeric" })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${ordinal(Number(parts.day))} day of ${parts.month}, ${parts.year}`;
}

function ageOn(birth: Date, on: Date): number {
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

/**
 * The letterhead's city line. Most LGUs are municipalities, so a bare name
 * ("Sto. Domingo") reads "Municipality of Sto. Domingo"; a city should be
 * entered with the word in it ("Danao City", "City of Danao") and is kept as is.
 */
export function cityLineOf(city: string): string {
  if (!city) return "";
  return /\b(city|municipality)\b/i.test(city) ? city : `Municipality of ${city}`;
}

/** "Barangay Quisol" from "Brgy. Quisol", "Barangay Quisol" or "Quisol". */
export function barangayTitle(name: string): string {
  const bare = name.replace(/^(brgy\.?|barangay)\s+/i, "").trim();
  return bare ? `Barangay ${bare}` : "Barangay";
}

export async function buildCertificatePdfProps(
  certificate: CertificateForPdf,
  storedTemplate: TemplateForPdf
): Promise<CertificatePdfPropsResult> {
  const template = upgradeLegacyTemplate(certificate.certificate_type, {
    ...storedTemplate,
    closing_line: storedTemplate.closing_line ?? "",
  });
  const r = certificate.resident;

  const originalName = r
    ? [r.lname, ", ", r.fname, r.name_extension ? ` ${r.name_extension}` : "", r.mname ? ` ${r.mname[0]}.` : ""].join("")
    : certificate.manual_name ?? "";
  // On the certificate itself the name reads in natural order: JUAN S. DELA CRUZ JR.
  const naturalName = r
    ? [r.fname, r.mname ? `${r.mname[0]}.` : "", r.lname, r.name_extension ?? ""].filter(Boolean).join(" ")
    : certificate.manual_name ?? "";
  const fullName = (certificate.override_full_name || naturalName).toUpperCase();
  const applicantName = (certificate.override_full_name || originalName).toUpperCase();

  const { barangay, captain, officials, logos } = await getLetterhead();
  const brgy = barangayTitle(barangay.name);
  const purok = r?.purok?.name ?? "";
  const address =
    certificate.override_address ||
    r?.household?.address ||
    certificate.manual_address ||
    [purok, brgy, barangay.city].filter(Boolean).join(", ") ||
    "this barangay";

  const issued = certificate.issued_at ? new Date(certificate.issued_at) : new Date();
  const birth = r?.birthdate ? new Date(r.birthdate) : null;
  const age = birth ? ageOn(birth, issued) : null;
  const civil = r?.civil_status ? CIVIL[r.civil_status] ?? r.civil_status.toLowerCase() : "";
  const citizenship = r?.citizenship || "Filipino";
  const details = [age !== null ? `${age} year${age === 1 ? "" : "s"} old` : "of legal age", civil, citizenship]
    .filter(Boolean)
    .join(", ");
  const since = r?.residency_start_date
    ? new Date(r.residency_start_date).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", year: "numeric" })
    : "the date shown in barangay records";

  const values: Record<string, string> = {
    full_name: fullName,
    address,
    purpose: certificate.purpose,
    captain_name: captain.name,
    captain_position: captain.position,
    barangay_name: brgy,
    city: barangay.city,
    province: barangay.province,
    date_issued: longIssueDate(issued),
    person_details: details,
    age: age !== null ? String(age) : "",
    civil_status: civil,
    sex: r?.sex ? r.sex.toLowerCase() : "",
    purok,
    resident_since: since,
    he_she: r?.sex === "MALE" ? "he" : r?.sex === "FEMALE" ? "she" : "he/she",
  };

  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/verify/${certificate.verification_code}`;
  // Non-fatal if this fails — the certificate is still valid without a QR
  // image, it just won't have one to scan.
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 }).catch((err) => {
    console.error("[certificate PDF] QR generation failed:", err);
    return undefined;
  });

  return {
    title: renderTemplate(template.title, values),
    body: renderTemplate(template.body, values),
    closing: renderTemplate(template.closing_line ?? "", values),
    purpose: certificate.purpose,
    certificateNo: certificate.certificate_no,
    queueNumber: certificate.queue_number ?? "",
    applicantName,
    bodyName: fullName,
    flaggedManual: certificate.flagged_manual,
    captainName: captain.name,
    captainPosition: captain.position || "Punong Barangay",
    barangayName: brgy,
    city: barangay.city,
    province: barangay.province,
    region: barangay.region,
    barangayAddress: barangay.address,
    barangayContact: [barangay.contact, barangay.email].filter(Boolean).join(" · "),
    officials,
    logoBarangay: logos.barangay || undefined,
    logoCity: logos.city || undefined,
    cityLine: cityLineOf(barangay.city),
    dateIssued: certificate.issued_at
      ? new Date(certificate.issued_at).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" })
      : "",
    validityNote: EXPIRES.has(certificate.certificate_type) ? "Valid for six (6) months from the date of issue." : "",
    paid: certificate.payment_status === "PAID" || certificate.payment_status === "WAIVED",
    qrDataUrl,
  };
}