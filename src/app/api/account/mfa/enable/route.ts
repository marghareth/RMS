// FILE: src/app/api/account/mfa/enable/route.ts
//
// POST { token } — confirms enrollment: the user proves they can actually
// generate a valid code from the secret handed out by /setup, and only
// then does mfa_enabled flip to true. Also issues one-time backup codes
// (returned in plaintext exactly once — the response body — and stored
// only as bcrypt hashes from then on).
//
// BUGFIX: this had no rate limiting at all. A TOTP code is only 6 digits
// (1,000,000 possibilities) — with an unlimited number of guesses against
// a fixed 30s-window secret, brute-forcing it here becomes feasible for
// anyone who already holds a valid session (e.g. a stolen/hijacked
// cookie) but not the victim's actual authenticator device. Gated behind
// the same per-user limiter shape as login's, keyed by user id rather
// than username since this route is already authenticated.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { mfaEnableSchema } from "@/lib/validations";
import { verifyTotp, generateBackupCodes, hashBackupCodes } from "@/lib/mfa";
import { RateLimiter, tooManyRequestsResponse } from "@/lib/rate-limit";

const mfaEnableLimiter = new RateLimiter({
  namespace: "mfa-enable",
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);

  // Every submission counts against the budget, success or fail — unlike
  // login's peek/penalize split, there's no "harmless retry" shape here:
  // each POST is itself a code guess.
  const attempt = await mfaEnableLimiter.check(String(userId));
  if (!attempt.allowed) return tooManyRequestsResponse(attempt.retryAfterSeconds);

  const { token } = mfaEnableSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (!user.mfa_secret) {
    return NextResponse.json(
      { error: "SETUP_NOT_STARTED", message: "Call /api/account/mfa/setup first." },
      { status: 400 }
    );
  }

  if (!verifyTotp(user.mfa_secret, token)) {
    return NextResponse.json(
      { error: "INVALID_CODE", message: "That code didn't match. Check the time on your device and try again." },
      { status: 400 }
    );
  }

  const backupCodes = generateBackupCodes();
  const hashed = await hashBackupCodes(backupCodes);

  await prisma.user.update({
    where: { id: userId },
    data: { mfa_enabled: true, mfa_backup_codes: hashed },
  });

  // A successful confirmation is the end of this flow — clear the budget
  // so it doesn't linger and affect an unrelated future setup attempt.
  await mfaEnableLimiter.reset(String(userId));

  await logAudit({
    user_id: userId,
    action: "MFA_ENABLED",
    table_affected: "User",
    record_id: userId,
    details: `${user.username} enabled TOTP multi-factor auth`,
  });

  // Shown to the user exactly once — the UI must tell them to save these
  // before navigating away.
  return NextResponse.json({ backupCodes });
});