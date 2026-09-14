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

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { generateTotpSecret, buildOtpauthUrl } from "@/lib/mfa";

export const POST = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

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