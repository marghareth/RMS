// FILE: src/app/api/pdf/certificate/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { renderTemplate } from "@/lib/mock/certificateTemplates";
import { MOCK_ACTIVE_CAPTAIN, MOCK_BARANGAY_INFO } from "@/lib/mock/certificates";
import CertificatePDF from "@/lib/pdf/CertificatePDF";

// @react-pdf/renderer renders with a real Node canvas/font pipeline, which
// isn't available on the Edge runtime — this route must run on Node.
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid certificate id" }, { status: 400 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      resident: { include: { purok: true, household: true } },
    },
  });
  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const template = await prisma.certificateTemplate.findUnique({
    where: { certificate_type: certificate.certificate_type },
  });
  if (!template) return NextResponse.json({ error: "Template not found for this certificate type" }, { status: 404 });

  const fullName = certificate.resident
    ? [
        certificate.resident.lname,
        ", ",
        certificate.resident.fname,
        certificate.resident.name_extension ? ` ${certificate.resident.name_extension}` : "",
        certificate.resident.mname ? ` ${certificate.resident.mname[0]}.` : "",
      ].join("").toUpperCase()
    : (certificate.manual_name ?? "").toUpperCase();

  const address =
    certificate.resident?.household?.address ??
    certificate.manual_address ??
    "this barangay";

  const values: Record<string, string> = {
    full_name: fullName,
    address,
    purpose: certificate.purpose,
    captain_name: MOCK_ACTIVE_CAPTAIN.name,
    captain_position: MOCK_ACTIVE_CAPTAIN.position,
    barangay_name: MOCK_BARANGAY_INFO.name,
    city: MOCK_BARANGAY_INFO.city,
    province: MOCK_BARANGAY_INFO.province,
    date_issued: new Date(certificate.issued_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };

  const buffer = await renderToBuffer(
    createElement(CertificatePDF, {
      title: renderTemplate(template.title, values),
      body: renderTemplate(template.body, values),
      closing: renderTemplate(template.closing_line ?? "", values),
      purpose: certificate.purpose,
      certificateNo: `CERT-${String(certificate.id).padStart(6, "0")}`,
      applicantName: fullName,
      flaggedManual: certificate.flagged_manual,
      captainName: MOCK_ACTIVE_CAPTAIN.name,
      captainPosition: MOCK_ACTIVE_CAPTAIN.position,
      barangayName: MOCK_BARANGAY_INFO.name,
      city: MOCK_BARANGAY_INFO.city,
      province: MOCK_BARANGAY_INFO.province,
      region: MOCK_BARANGAY_INFO.region,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${certificate.id}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}