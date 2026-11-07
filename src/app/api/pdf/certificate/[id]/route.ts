// FILE: src/app/api/pdf/certificate/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import CertificatePDF from "@/lib/pdf/CertificatePDF";
import { buildCertificatePdfProps } from "@/lib/pdf/buildCertificatePdfProps";
import { withErrorHandling } from "@/lib/api-handler";

// @react-pdf/renderer renders with a real Node canvas/font pipeline, which
// isn't available on the Edge runtime — this route must run on Node.
export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
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

  const props = await buildCertificatePdfProps(certificate, template);
  const buffer = await renderToBuffer(createElement(CertificatePDF, props));

  // ?download=1 (Download PDF on the preview page, Nov 2026) saves the file
  // instead of opening it in the browser's PDF viewer. Named after the
  // certificate number, e.g. CERT-2026-000218.pdf.
  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = `${certificate.certificate_no.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
});