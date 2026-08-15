// FILE: src/app/api/certificates/bulk-release/route.ts
//
// POST { ids: number[] } — releases multiple certificate requests at once
// (the "Release Selected" bulk action on the Certificates list page).
// Applies the exact same PENDING/PROCESSING -> RELEASED transition rule as
// the single-certificate POST /api/certificates/[id]/process route. A
// certificate already RELEASED/CANCELLED is skipped (reported, not a hard
// failure) rather than aborting the whole batch over one bad row.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { bulkReleaseCertificatesSchema } from "@/lib/validations";

const ALLOWED_FROM = ["PENDING", "PROCESSING"];

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("certificates:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { ids } = bulkReleaseCertificatesSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);

  const certificates = await prisma.certificate.findMany({ where: { id: { in: ids } } });

  const released: number[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const id of ids) {
    const cert = certificates.find((c: { id: number }) => c.id === id);
    if (!cert) {
      skipped.push({ id, reason: "Not found" });
      continue;
    }
    if (!ALLOWED_FROM.includes(cert.status)) {
      skipped.push({ id, reason: `Already ${cert.status.toLowerCase()}` });
      continue;
    }

    await prisma.certificate.update({
      where: { id },
      data: { status: "RELEASED", issued_at: new Date() },
    });
    released.push(id);

    await logAudit({
      user_id: userId,
      action: "PROCESS",
      table_affected: "Certificate",
      record_id: id,
      details: `Bulk-released ${cert.certificate_no} (${cert.queue_number}) from ${cert.status}`,
    });
  }

  return NextResponse.json({ released, skipped });
});