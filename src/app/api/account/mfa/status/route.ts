// FILE: src/app/api/account/mfa/status/route.ts
//
// GET — whether the current user has MFA enabled, and whether their role
// requires it (ADMIN/CAPTAIN — see src/lib/mfa-policy.ts). Drives both
// the account security page and the dashboard nudge banner.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { roleRequiresMfa, isMfaEnforcementOn } from "@/lib/mfa-policy";

export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    enabled: user.mfa_enabled,
    recommended: roleRequiresMfa(user.role),
    // True when this account is blocked from the rest of the app until it
    // enrolls (role requires MFA, not enrolled, enforcement not switched off).
    enforced: roleRequiresMfa(user.role) && !user.mfa_enabled && isMfaEnforcementOn(),
    backupCodesRemaining: user.mfa_backup_codes.length,
  });
});