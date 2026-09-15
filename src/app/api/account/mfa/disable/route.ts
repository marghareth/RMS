// FILE: src/app/api/account/mfa/disable/route.ts
//
// POST { password, token } — turns MFA off for the current user.
// Requires both the account password AND a valid TOTP/backup code so a
// stolen session alone (e.g. an unlocked browser tab) can't disable
// protection; whoever disables it has to prove they hold both factors,
// same bar as a fresh sign-in.
//
// BUGFIX: same gap as /enable — no rate limiting meant a held session
// (without the real device) could brute-force the 6-digit TOTP code, or
// the 8-character backup code, with unlimited attempts. Gated behind the
// same per-user-id limiter shape.
//
// Note on `consumeBackupCode`'s `remaining` value below: unlike the
// backup-code consumption in src/lib/auth.ts (a real sign-in), this
// route doesn't need to persist `remaining` separately — a successful
// disable immediately overwrites `mfa_backup_codes` to `[]` a few lines
// down, which already makes the consumed code (and every other one)
// unusable. Persisting `remaining` first would just be a redundant write
// with the same end state.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { mfaDisableSchema } from "@/lib/validations";
import { verifyTotp, consumeBackupCode } from "@/lib/mfa";
import { RateLimiter, tooManyRequestsResponse } from "@/lib/rate-limit";

const mfaDisableLimiter = new RateLimiter({
  namespace: "mfa-disable",
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);

  // Every submission counts against the budget, success or fail — each
  // POST here is itself a password/code guess, there's no harmless retry
  // shape to carve out the way login's peek/penalize does.
  const attempt = await mfaDisableLimiter.check(String(userId));
  if (!attempt.allowed) return tooManyRequestsResponse(attempt.retryAfterSeconds);

  const { password, token } = mfaDisableSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 400 });
  }

  if (!user.mfa_enabled) {
    return NextResponse.json({ error: "MFA_NOT_ENABLED" }, { status: 400 });
  }

  const validTotp = user.mfa_secret ? verifyTotp(user.mfa_secret, token) : false;
  const validBackup = validTotp ? true : (await consumeBackupCode(token, user.mfa_backup_codes)).valid;

  if (!validTotp && !validBackup) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfa_enabled: false, mfa_secret: null, mfa_backup_codes: [] },
  });

  // A successful disable is the end of this flow — clear the budget so
  // it doesn't linger and affect a later, unrelated re-enable attempt.
  await mfaDisableLimiter.reset(String(userId));

  await logAudit({
    user_id: userId,
    action: "MFA_DISABLED",
    table_affected: "User",
    record_id: userId,
    details: `${user.username} disabled TOTP multi-factor auth`,
  });

  return NextResponse.json({ ok: true });
});