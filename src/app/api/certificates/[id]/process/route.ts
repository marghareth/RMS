// FILE: src/app/api/certificates/[id]/process/route.ts
//
// Advances a certificate request through the Document Request Workflow:
// PENDING -> PROCESSING -> RELEASED. Direct PENDING -> RELEASED is also
// allowed for quick walk-in issuance. RELEASED and CANCELLED are terminal —
// no further transitions are accepted once there.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { certificateProcessSchema } from "@/lib/validations";

const ALLOWED_FROM: Record<string, string[]> = {
  PROCESSING: ["PENDING"],
  RELEASED: ["PENDING", "PROCESSING"],
};

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = certificateProcessSchema.parse(await req.json());

  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Certificate request not found.");

  const allowedFrom = ALLOWED_FROM[body.status];
  if (!allowedFrom || !allowedFrom.includes(existing.status)) {
    throw new ApiError(
      409,
      "INVALID_TRANSITION",
      `Cannot move a ${existing.status.toLowerCase()} request to ${body.status.toLowerCase()}.`
    );
  }

  const certificate = await prisma.certificate.update({
    where: { id },
    data: {
      status: body.status,
      // Only stamp issued_at the moment it actually becomes RELEASED — this
      // is what the certificate PDF and audit trail treat as the true
      // "date issued", not creation time.
      issued_at: body.status === "RELEASED" ? new Date() : undefined,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "PROCESS",
    table_affected: "Certificate",
    record_id: id,
    details: `Moved ${certificate.certificate_no} (${certificate.queue_number}) from ${existing.status} to ${body.status}`,
  });

  return NextResponse.json(certificate);
});