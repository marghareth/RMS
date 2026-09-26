// FILE: src/app/api/certificates/[id]/route.ts
//
// Fetches and updates a single certificate request as JSON. This is what
// the Document Queue, the certificate detail page, and the certificate
// preview page all call — it must return JSON, never the rendered PDF.
// PDF output lives at its own route, GET /api/pdf/certificate/[id], which
// renders through @react-pdf/renderer. Status transitions (PENDING ->
// PROCESSING -> RELEASED, or -> CANCELLED) are handled by the dedicated
// POST /api/certificates/[id]/process and /cancel routes, not here — PATCH
// on this route is intentionally limited to payment_status so it can't be
// used to bypass those transition rules.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { certificatePaymentSchema } from "@/lib/validations";

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
      issuer: { select: { id: true, username: true, role: true } },
    },
  });
  if (!certificate) throw new ApiError(404, "NOT_FOUND", "Certificate request not found.");

  return NextResponse.json(certificate);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid certificate id" }, { status: 400 });
  }

  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Certificate request not found.");

  const body = certificatePaymentSchema.parse(await req.json());

  const certificate = await prisma.certificate.update({
    where: { id },
    data: { payment_status: body.payment_status },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Certificate",
    record_id: id,
    details: `Set payment status of ${certificate.certificate_no} (${certificate.queue_number}) to ${body.payment_status}`,
  });

  return NextResponse.json(certificate);
});