// FILE: src/app/api/account/password/route.ts
//
// POST { currentPassword, newPassword } — the signed-in user changes their
// own password. No approval needed: they prove who they are by typing the
// current password (or the temporary one an admin gave them), so a person
// at an unlocked computer can't change it.
//
// On success the account's password_changed_at moves forward, which ends
// every session for this account, this one included (src/lib/session.ts).
// The page then sends the user to the login screen to sign in again with
// the new password.
//
// Uses requireAuth, not requirePermission, so it still works while the
// account is confined to this page by a temporary password.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { passwordChangeSchema } from "@/lib/validations";
import { passwordProblem } from "@/lib/password-policy";
import { RateLimiter, tooManyRequestsResponse } from "@/lib/rate-limit";

// Each attempt is a guess at the current password, so every POST counts.
const passwordChangeLimiter = new RateLimiter({
  namespace: "password-change",
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);

  const attempt = await passwordChangeLimiter.check(String(userId));
  if (!attempt.allowed) return tooManyRequestsResponse(attempt.retryAfterSeconds);

  const { currentPassword, newPassword } = passwordChangeSchema.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, password_hash: true, must_change_password: true, temp_password_expires_at: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    return NextResponse.json(
      { error: "INVALID_PASSWORD", message: "Your current password isn't right." },
      { status: 400 }
    );
  }

  if (user.temp_password_expires_at && user.temp_password_expires_at.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "TEMP_PASSWORD_EXPIRED", message: "Your temporary password has expired. Ask your administrator for a new one." },
      { status: 400 }
    );
  }

  const problem = passwordProblem(newPassword, user.username);
  if (problem) {
    return NextResponse.json({ error: "WEAK_PASSWORD", message: problem }, { status: 400 });
  }

  if (await bcrypt.compare(newPassword, user.password_hash)) {
    return NextResponse.json(
      { error: "SAME_PASSWORD", message: "Choose a password different from your current one." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        password_hash: await bcrypt.hash(newPassword, 10),
        must_change_password: false,
        temp_password_expires_at: null,
        password_changed_at: new Date(),
      },
    });
    await logAudit(
      {
        user_id: userId,
        action: "PASSWORD_CHANGED",
        table_affected: "User",
        record_id: userId,
        details: user.must_change_password
          ? `${user.username} replaced a temporary password`
          : `${user.username} changed their password`,
      },
      tx
    );
  });

  await passwordChangeLimiter.reset(String(userId));

  return NextResponse.json({ ok: true });
});