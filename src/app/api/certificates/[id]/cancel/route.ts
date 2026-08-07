// FILE: src/app/api/certificates/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().trim().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = cancelSchema.parse(await req.json().catch(() => ({})));

  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Certificate request not found.");

  if (existing.status === "RELEASED") {
    throw new ApiError(409, "ALREADY_RELEASED", "This document has already been released and cannot be cancelled.");
  }
  if (existing.status === "CANCELLED") {
    throw new ApiError(409, "ALREADY_CANCELLED", "This request has already been cancelled.");
  }

  const certificate = await prisma.certificate.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CANCEL",
    table_affected: "Certificate",
    record_id: id,
    details: `Cancelled request ${certificate.queue_number}${body.reason ? ` — ${body.reason}` : ""}`,
  });

  return NextResponse.json(certificate);
});