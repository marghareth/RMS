// FILE: src/app/api/certificates/bulk-release/route.ts
//
// POST { ids: number[] } — releases multiple certificate requests at once
// (the "Release Selected" bulk action on the Certificates list page).
// Applies the exact same PENDING/PROCESSING -> RELEASED transition rule as
// the single-certificate POST /api/certificates/[id]/process route. A
// certificate already RELEASED/CANCELLED is skipped (reported, not a hard
// failure) rather than aborting the whole batch over one bad row.
//
// Rate-limited per user (not just per IP — several staff can share an
// office network) via the shared limiter in src/lib/rate-limit.ts. This
// is an authenticated, permission-gated action already, so the limit
// here is about containing the blast radius of a compromised session or
// a buggy client retry loop, not stopping an anonymous attacker.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { bulkReleaseCertificatesSchema } from "@/lib/validations";
import { RateLimiter, tooManyRequestsResponse } from "@/lib/rate-limit";

const ALLOWED_FROM = ["PENDING", "PROCESSING"];

const bulkReleaseLimiter = new RateLimiter({
  namespace: "certificates-bulk-release",
  max: 10,
  windowMs: 60 * 1000, // 1 minute
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("certificates:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);

  const attempt = await bulkReleaseLimiter.check(String(userId));
  if (!attempt.allowed) return tooManyRequestsResponse(attempt.retryAfterSeconds);

  const { ids } = bulkReleaseCertificatesSchema.parse(await req.json());

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