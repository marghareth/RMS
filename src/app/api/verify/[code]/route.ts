// FILE: src/app/api/verify/[code]/route.ts
//
// GET — public, unauthenticated lookup by a certificate's opaque
// verification_code (see the comment on Certificate.verification_code in
// prisma/schema.prisma for why this is a separate field from the
// sequential, guessable certificate_no). Backs the public
// /verify/[code] page — this route was previously an empty stub with no
// implementation at all.
//
// Rate-limited per IP via the shared limiter in src/lib/rate-limit.ts.
// verification_code is a UUID (not practically guessable), so this isn't
// closing an active hole so much as adding defense-in-depth: without a
// limit, nothing stops a scripted GET-in-a-loop from using this as a
// cheap way to probe for any valid code, or from hammering the DB.
//
// Deliberately returns a minimal, low-sensitivity field set — enough to
// confirm a certificate is genuine and see who it was issued to, not a
// full resident/finance record. No auth is required to hit this route at
// all (see middleware.ts), so anything returned here should be treated
// as public.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RateLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";

const verifyLimiter = new RateLimiter({
  namespace: "verify",
  max: 20,
  windowMs: 5 * 60 * 1000, // 5 minutes
});

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const ip = getClientIp(req);
  const attempt = await verifyLimiter.check(ip);
  if (!attempt.allowed) return tooManyRequestsResponse(attempt.retryAfterSeconds);

  const { code } = await context!.params;

  const certificate = await prisma.certificate.findUnique({
    where: { verification_code: code },
    include: { resident: true },
  });

  if (!certificate || certificate.status !== "RELEASED") {
    // Same response whether the code is malformed, unknown, or belongs
    // to a certificate that was never actually released — don't give a
    // prober any signal about which case it is.
    return NextResponse.json({ valid: false });
  }

  const holderName = certificate.flagged_manual
    ? certificate.manual_name
    : certificate.resident
    ? `${certificate.resident.fname} ${certificate.resident.lname}`
    : null;

  return NextResponse.json({
    valid: true,
    certificate_no: certificate.certificate_no,
    certificate_type: certificate.certificate_type,
    issued_at: certificate.issued_at,
    holder_name: holderName,
  });
});