// FILE: src/app/api/pdf/slip/[kind]/[id]/route.ts
//
// GET — the printable request slip (src/lib/pdf/RequestSlipPDF.tsx) for
//   certificate/[id]   a document request (by certificate id)
//   barangay-id/[id]   a Barangay ID issued
//   blotter/[id]       a blotter case filed
//   borrowing/[id]     an equipment borrowing
// Offered on the "Request filed" screen after each of those is saved, and
// can be reprinted any time from the same URL.

import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { getLetterhead } from "@/lib/barangay-info";
import { barangayTitle } from "@/lib/pdf/buildCertificatePdfProps";
import RequestSlipPDF, { type RequestSlipProps } from "@/lib/pdf/RequestSlipPDF";

export const runtime = "nodejs";

const PERMISSION = {
  certificate: "certificates:read",
  "barangay-id": "barangay_id:read",
  blotter: "blotter:read",
  borrowing: "equipment:read",
} as const;
type Kind = keyof typeof PERMISSION;

const CERT_LABEL: Record<string, string> = {
  RESIDENCY: "Certificate of Residency",
  INDIGENCY: "Certificate of Indigency",
  CLEARANCE: "Barangay Clearance",
  GOOD_MORAL: "Certificate of Good Moral Character",
  BUSINESS_PERMIT: "Barangay Business Clearance",
  COHABITATION: "Certificate of Cohabitation",
  SOLO_PARENT: "Solo Parent Certification",
  FIRST_TIME_JOB_SEEKER: "First-Time Job Seeker Certification",
  LATE_REGISTRATION: "Certificate for Late Registration",
};

const when = (d: Date | null | undefined, time = true) =>
  d
    ? d.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
        ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
      })
    : "";
type NameParts = { fname: string; lname: string; mname: string | null; name_extension: string | null };
const nameOf = (r: NameParts | null | undefined) =>
  r ? [r.fname, r.mname ? `${r.mname[0]}.` : "", r.lname, r.name_extension ?? ""].filter(Boolean).join(" ") : "";
const titleCase = (v: string) => v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type SlipContent = Omit<RequestSlipProps, "barangayName" | "cityLine" | "logo">;

async function slipFor(kind: Kind, id: number): Promise<SlipContent | null> {
  switch (kind) {
    case "certificate": {
      const c = await prisma.certificate.findUnique({
        where: { id },
        include: { resident: { include: { household: true, purok: true } }, issuer: { select: { username: true } } },
      });
      if (!c) return null;
      return {
        title: "Document Request",
        subtitle: CERT_LABEL[c.certificate_type] ?? titleCase(c.certificate_type),
        reference: { label: "Queue No.", value: c.queue_number },
        rows: [
          { label: "Requested by", value: c.override_full_name || nameOf(c.resident) || c.manual_name || "" },
          { label: "Address", value: c.override_address || c.resident?.household?.address || c.manual_address || "" },
          { label: "Purpose", value: c.purpose },
          { label: "Filed on", value: when(c.requested_at) },
          { label: "Certificate No.", value: c.certificate_no },
          { label: "Payment", value: titleCase(c.payment_status) },
          { label: "Status", value: titleCase(c.status) },
        ],
        note: "Present this slip and a valid ID when claiming the document. This slip is not a certificate.",
        recordedBy: c.issuer.username,
      };
    }
    case "barangay-id": {
      const b = await prisma.barangayId.findUnique({
        where: { id },
        include: { resident: { include: { purok: true } }, issuer: { select: { username: true } } },
      });
      if (!b) return null;
      return {
        title: "Barangay ID",
        subtitle: "Issuance record",
        reference: { label: "ID No.", value: b.id_number },
        rows: [
          { label: "Resident", value: nameOf(b.resident) },
          { label: "Purok", value: b.resident.purok?.name ?? "" },
          { label: "Issued on", value: when(b.issued_date) },
        ],
        note: "Present this slip when claiming the printed ID.",
        recordedBy: b.issuer.username,
      };
    }
    case "blotter": {
      const c = await prisma.blotterCase.findUnique({ where: { id } });
      if (!c) return null;
      return {
        title: "Blotter Case Filed",
        subtitle: c.incident_type,
        reference: { label: "Case No.", value: c.case_number },
        rows: [
          { label: "Complainant", value: c.complainant_name },
          { label: "Respondent", value: c.respondent_name },
          { label: "Incident date", value: when(c.incident_date, false) },
          { label: "Hearing", value: c.hearing_date ? when(c.hearing_date) : "To be scheduled" },
          { label: "Filed on", value: when(c.created_at) },
          { label: "Status", value: titleCase(c.status) },
        ],
        note: "Keep this slip. Bring it and a valid ID to the hearing. Failure to appear may affect your case.",
      };
    }
    case "borrowing": {
      const b = await prisma.equipmentBorrowing.findUnique({
        where: { id },
        include: { equipment: { select: { name: true, serial_number: true } }, recorder: { select: { username: true } } },
      });
      if (!b) return null;
      return {
        title: "Equipment Borrowing",
        subtitle: b.equipment.name,
        reference: { label: "Borrowing No.", value: `BRW-${String(b.id).padStart(5, "0")}` },
        rows: [
          { label: "Item", value: [b.equipment.name, b.equipment.serial_number ? `(S/N ${b.equipment.serial_number})` : ""].filter(Boolean).join(" ") },
          { label: "Borrower", value: b.borrower_name },
          { label: "Borrowed on", value: when(b.date_borrowed, false) },
          { label: "Return by", value: when(b.expected_return, false) },
        ],
        note: "Return the item in the same condition on or before the return date. The borrower is responsible for loss or damage.",
        recordedBy: b.recorder.username,
      };
    }
  }
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const { kind, id: idParam } = await context!.params;
  if (!(kind in PERMISSION)) return NextResponse.json({ error: "Unknown slip type" }, { status: 404 });
  const auth = await requirePermission(PERMISSION[kind as Kind], req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(idParam);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [content, letterhead] = await Promise.all([slipFor(kind as Kind, id), getLetterhead()]);
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { barangay, logos } = letterhead;
  const pdf = await renderToBuffer(
    createElement(RequestSlipPDF, {
      ...content,
      barangayName: barangayTitle(barangay.name),
      cityLine: [barangay.province && `Province of ${barangay.province}`, barangay.city].filter(Boolean).join(" · "),
      logo: logos.barangay || undefined,
    }) as Parameters<typeof renderToBuffer>[0]
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="slip-${kind}-${id}.pdf"` },
  });
});