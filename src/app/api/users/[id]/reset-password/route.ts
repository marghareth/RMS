// FILE: src/app/api/users/[id]/reset-password/route.ts
//
// POST — "Reset password" on a user's edit panel. An Admin or Secretary
// gets a one-time temporary password (valid 30 minutes) to hand over; the
// user must choose their own when they sign in. Nobody types or sees a
// permanent password for someone else.
//
// Same rules as approving a "Forgot password?" request: not your own
// account, and only an Admin can reset an Admin (src/lib/password-reset.ts).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { issueTemporaryPassword, resetBlockedReason } from "@/lib/password-reset";

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const targetId = parseInt(idParam);
  const actor = { id: parseInt(auth.session.user.id), role: auth.session.user.role };

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true, role: true, is_active: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocked = resetBlockedReason(actor, target);
  if (blocked) throw new ApiError(403, blocked.code, blocked.message);

  const issued = await prisma.$transaction((tx) => issueTemporaryPassword(tx, actor, target, "admin-reset"));
  return NextResponse.json(issued);
});