// FILE: src/app/api/account/mfa/setup/route.ts
//
// POST — starts MFA enrollment for the *currently signed-in* user (this
// is self-service, not admin-on-behalf-of; there's no permission string
// for it because every role is allowed to protect their own account).
//
// Generates a new TOTP secret and stores it on the user row immediately,
// but leaves mfa_enabled = false until /api/account/mfa/enable confirms
// the user actually has it loaded in an authenticator app. Calling this
// again before confirming simply overwrites the pending secret — safe,
// since nothing is enforced until enable() succeeds.
//
// SECURITY FIX: that "safe" only holds while MFA is still off. Once
// mfa_enabled is true, sign-in verifies codes against mfa_secret, so
// letting this route overwrite it meant anyone holding a session cookie
// (no password, no device) could swap in a secret they control — locking
// the real owner out of their authenticator and giving themselves a
// working second factor. Refuse while MFA is on; to re-enroll, disable
// first, which requires both the password and a current code.

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { generateTotpSecret, buildOtpauthUrl } from "@/lib/mfa";

export const POST = withErrorHandling(async () => {
  const auth = await requireAuth({ allowDuringMfaSetup: true });
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (user.mfa_enabled) {
    return NextResponse.json(
      {
        error: "MFA_ALREADY_ENABLED",
        message: "Two-factor authentication is already on. Disable it first to set up a new device.",
      },
      { status: 409 }
    );
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { mfa_secret: secret },
  });

  const otpauthUrl = buildOtpauthUrl(secret, user.username);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({
    secret,
    otpauthUrl,
    qrDataUrl,
  });
});