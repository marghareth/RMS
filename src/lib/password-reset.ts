// FILE: src/lib/password-reset.ts
//
// Issuing a temporary password, shared by the two places an Admin or
// Secretary can do it:
//   - approving a "Forgot password?" request (POST /api/users/reset-requests/[id])
//   - "Reset password" on a user's edit panel (POST /api/users/[id]/reset-password)
//
// Rules, checked by `resetBlockedReason` before anything is written:
//   - nobody resets their own password this way (they use Change password,
//     which needs the current one);
//   - only an Admin can reset an Admin's password, so a Secretary can't
//     take over an Admin account;
//   - deactivated accounts can't be reset.
//
// What a reset does, in one transaction:
//   - stores a bcrypt hash of an easy-to-read random password such as
//     "Mango-River-4827" (never the password itself) and returns the
//     plain text once, for the admin to hand over;
//   - makes it expire in 30 minutes and forces the user to choose their
//     own password at sign-in;
//   - moves password_changed_at forward, which signs the account out
//     everywhere it's still signed in;
//   - closes any open "Forgot password?" requests for that account;
//   - writes an audit entry.

import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTemporaryPassword } from "./weak-passwords";
import { logAudit } from "./audit";
import { TEMP_PASSWORD_TTL_MS } from "./password-policy";

export interface ResetActor {
  id: number;
  role: string;
}

export interface ResetTarget {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
}

/** Why this actor may not reset this account, or null if they may. */
export function resetBlockedReason(actor: ResetActor, target: ResetTarget): { code: string; message: string } | null {
  if (actor.id === target.id) {
    return { code: "OWN_ACCOUNT", message: "Use Change password to change your own password." };
  }
  if (target.role === "ADMIN" && actor.role !== "ADMIN") {
    return { code: "ADMIN_ONLY", message: "Only an Admin can reset an Admin's password." };
  }
  if (!target.is_active) {
    return { code: "INACTIVE", message: "This account is deactivated. Reactivate it first." };
  }
  return null;
}

export interface IssuedPassword {
  username: string;
  temporaryPassword: string;
  expiresAt: string;
}

export async function issueTemporaryPassword(
  tx: Prisma.TransactionClient,
  actor: ResetActor,
  target: ResetTarget,
  reason: "request-approved" | "admin-reset"
): Promise<IssuedPassword> {
  const temporaryPassword = generateTemporaryPassword();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TEMP_PASSWORD_TTL_MS);

  await tx.user.update({
    where: { id: target.id },
    data: {
      password_hash: await bcrypt.hash(temporaryPassword, 10),
      must_change_password: true,
      temp_password_expires_at: expiresAt,
      password_changed_at: now,
    },
  });

  await tx.passwordResetRequest.updateMany({
    where: { user_id: target.id, status: "PENDING" },
    data: { status: "APPROVED", resolved_at: now, resolved_by: actor.id },
  });

  await logAudit(
    {
      user_id: actor.id,
      action: "PASSWORD_RESET",
      table_affected: "User",
      record_id: target.id,
      details:
        reason === "request-approved"
          ? `Approved a password reset request for ${target.username} and issued a temporary password`
          : `Issued a temporary password for ${target.username}`,
    },
    tx
  );

  return { username: target.username, temporaryPassword, expiresAt: expiresAt.toISOString() };
}