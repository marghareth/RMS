// FILE: src/app/api/account/mfa/status/route.ts
//
// GET — whether the current user has MFA enabled, and whether their role
// is one where it's strongly recommended (ADMIN/CAPTAIN). Drives both
// the account security page and the dashboard nudge banner.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

const ROLES_REQUIRING_MFA = new Set(["ADMIN", "CAPTAIN"]);

export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    enabled: user.mfa_enabled,
    recommended: ROLES_REQUIRING_MFA.has(user.role),
    backupCodesRemaining: user.mfa_backup_codes.length,
  });
});