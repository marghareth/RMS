// FILE: src/app/api/forgot-password/route.ts
//
// POST { username } — "Forgot password?" on the login page. Public: the
// person isn't signed in.
//
// This never changes a password and never sends one anywhere. It only
// files a request that an Admin or Secretary sees on the Users page and in
// their notifications. They confirm who the person is, in person or by
// phone, and approve it, which issues a 30-minute temporary password
// (src/lib/password-reset.ts).
//
// The reply is always the same, whether the username exists, is
// deactivated, already has a request waiting, or was rate-limited, so the
// form can't be used to find out which usernames are real.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api-handler";
import { forgotPasswordSchema } from "@/lib/validations";
import { RESET_REQUEST_TTL_MS } from "@/lib/password-policy";
import { RateLimiter, getClientIp } from "@/lib/rate-limit";

const perUsername = new RateLimiter({ namespace: "forgot-user", max: 3, windowMs: 60 * 60 * 1000 });
const perIp = new RateLimiter({ namespace: "forgot-ip", max: 10, windowMs: 60 * 60 * 1000 });

const REPLY = {
  ok: true,
  message:
    "If that username is registered, the barangay administrator will get your request. They'll check that it's you, then give you a temporary password.",
};

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { username } = forgotPasswordSchema.parse(await req.json());

  const [byIp, byUser] = await Promise.all([
    perIp.check(getClientIp(req)),
    perUsername.check(username.toLowerCase()),
  ]);
  if (!byIp.allowed || !byUser.allowed) return NextResponse.json(REPLY);

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, is_active: true },
  });

  if (user?.is_active) {
    const since = new Date(Date.now() - RESET_REQUEST_TTL_MS);
    const waiting = await prisma.passwordResetRequest.findFirst({
      where: { user_id: user.id, status: "PENDING", requested_at: { gt: since } },
      select: { id: true },
    });
    if (!waiting) {
      await prisma.passwordResetRequest.create({ data: { user_id: user.id } });
    }
  }

  return NextResponse.json(REPLY);
});