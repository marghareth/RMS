// FILE: src/app/api/users/reset-requests/[id]/route.ts
//
// POST { action: "approve" | "deny" } — an Admin or Secretary answers a
// "Forgot password?" request.
//
//   approve → issues a one-time temporary password (valid 30 minutes) and
//             returns it once, for the admin to hand over in person. The
//             user must choose their own password when they sign in.
//   deny    → closes the request; nothing on the account changes.
//
// The rules in resetBlockedReason (src/lib/password-reset.ts) apply: you
// can't approve your own request, and only an Admin can approve one for
// an Admin account.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { resetRequestActionSchema } from "@/lib/validations";
import { RESET_REQUEST_TTL_MS } from "@/lib/password-policy";
import { issueTemporaryPassword, resetBlockedReason } from "@/lib/password-reset";

export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const requestId = parseInt(idParam);
  const { action } = resetRequestActionSchema.parse(await req.json());
  const actor = { id: parseInt(auth.session.user.id), role: auth.session.user.role };

  const request = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      requested_at: true,
      user: { select: { id: true, username: true, role: true, is_active: true } },
    },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lapsed = Date.now() - request.requested_at.getTime() > RESET_REQUEST_TTL_MS;
  if (request.status !== "PENDING" || lapsed) {
    throw new ApiError(410, "REQUEST_CLOSED", "This request was already handled or has expired.");
  }

  const blocked = resetBlockedReason(actor, request.user);
  if (blocked) throw new ApiError(403, blocked.code, blocked.message);

  if (action === "deny") {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: "DENIED", resolved_at: new Date(), resolved_by: actor.id },
      });
      await logAudit(
        {
          user_id: actor.id,
          action: "PASSWORD_RESET_DENIED",
          table_affected: "User",
          record_id: request.user.id,
          details: `Denied a password reset request for ${request.user.username}`,
        },
        tx
      );
    });
    return NextResponse.json({ ok: true });
  }

  const issued = await prisma.$transaction((tx) =>
    issueTemporaryPassword(tx, actor, request.user, "request-approved")
  );
  return NextResponse.json(issued);
});