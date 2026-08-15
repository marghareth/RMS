// FILE: src/lib/pdf/buildCertificatePdfProps.ts
//
// Shared between GET /api/pdf/certificate/[id] (one certificate) and
// GET /api/pdf/certificate/bulk (many, one PDF) so the name-formatting,
// address fallback, template interpolation, and QR generation logic lives
// in exactly one place.

import QRCode from "qrcode";
import { renderTemplate } from "@/lib/mock/certificateTemplates";
import { MOCK_ACTIVE_CAPTAIN, MOCK_BARANGAY_INFO } from "@/lib/mock/certificates";

// Structural types rather than importing Prisma's generated types directly —
// keeps this helper decoupled from exactly which fields a given `include`
// pulled in, as long as the shape matches.
export interface CertificateForPdf {
  id: number;
  certificate_no: string;
  certificate_type: string;
  purpose: string;
  issued_at: Date | string | null;
  flagged_manual: boolean;
  manual_name: string | null;
  manual_address: string | null;
  verification_code: string;
  resident: {
    fname: string;
    lname: string;
    mname: string | null;
    name_extension: string | null;
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
  applicantName: string;
  flaggedManual: boolean;
  captainName: string;
  captainPosition: string;
  barangayName: string;
  city: string;
  province: string;
  region: string;
  qrDataUrl?: string;
}

export async function buildCertificatePdfProps(
  certificate: CertificateForPdf,
  template: TemplateForPdf
): Promise<CertificatePdfPropsResult> {
  const fullName = certificate.resident
    ? [
        certificate.resident.lname,
        ", ",
        certificate.resident.fname,
        certificate.resident.name_extension ? ` ${certificate.resident.name_extension}` : "",
        certificate.resident.mname ? ` ${certificate.resident.mname[0]}.` : "",
      ]
        .join("")
        .toUpperCase()
    : (certificate.manual_name ?? "").toUpperCase();

  const address = certificate.resident?.household?.address ?? certificate.manual_address ?? "this barangay";

  const values: Record<string, string> = {
    full_name: fullName,
    address,
    purpose: certificate.purpose,
    captain_name: MOCK_ACTIVE_CAPTAIN.name,
    captain_position: MOCK_ACTIVE_CAPTAIN.position,
    barangay_name: MOCK_BARANGAY_INFO.name,
    city: MOCK_BARANGAY_INFO.city,
    province: MOCK_BARANGAY_INFO.province,
    date_issued: certificate.issued_at
      ? new Date(certificate.issued_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "",
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
    applicantName: fullName,
    flaggedManual: certificate.flagged_manual,
    captainName: MOCK_ACTIVE_CAPTAIN.name,
    captainPosition: MOCK_ACTIVE_CAPTAIN.position,
    barangayName: MOCK_BARANGAY_INFO.name,
    city: MOCK_BARANGAY_INFO.city,
    province: MOCK_BARANGAY_INFO.province,
    region: MOCK_BARANGAY_INFO.region,
    qrDataUrl,
  };
}