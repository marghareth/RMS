// FILE: src/app/api/account/mfa/enable/route.ts
//
// POST { token } — confirms enrollment: the user proves they can actually
// generate a valid code from the secret handed out by /setup, and only
// then does mfa_enabled flip to true. Also issues one-time backup codes
// (returned in plaintext exactly once — the response body — and stored
// only as bcrypt hashes from then on).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { mfaEnableSchema } from "@/lib/validations";
import { verifyTotp, generateBackupCodes, hashBackupCodes } from "@/lib/mfa";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { token } = mfaEnableSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);

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