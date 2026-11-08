// FILE: src/app/api/users/[id]/route.ts
//
// FIX: PATCH/DELETE here had no protection against removing the last
// active ADMIN — an ADMIN could demote their own account's role, or
// deactivate themselves (or the only other admin), with nothing checking
// whether that would leave the system with zero active ADMIN accounts.
// Only ADMIN and SECRETARY hold "users:write" (src/lib/permission.ts), and
// only an ADMIN can manage ADMIN accounts (below), so losing the last
// ADMIN means no one left in the app can create one again — a full
// lockout recoverable only via direct DB access.
//
// Fix: before an update/deactivation would result in fewer than one
// active ADMIN, reject it with a clear 409.
//
// TS FIX: `userUpdateSchema` is `userCreateSchema.partial().extend(...)`,
// so `body.role` and `body.is_active` are typed `string | undefined` /
// `boolean | undefined` — TS2345 correctly flagged passing those straight
// into `wouldRemoveLastActiveAdmin`, which requires non-optional values.
// This wasn't just a type-checker nag: at runtime, a caller PATCHing only
// `{ password: "..." }` (a legitimate partial update) would send `role`
// and `is_active` as `undefined`, and the old code passed them through
// as-is — silently bypassing the last-admin check instead of falling back
// to the user's current values. Fixed by loading the existing user first
// and resolving each field to `body.field ?? existing.field` before the
// check and before the write, so partial updates are evaluated against
// what the record will actually become.
//
// PASSWORDS (Nov 2026): PATCH no longer accepts a password. An admin
// typing a new password for someone else meant they knew it; "Reset
// password" now issues a one-time temporary password instead
// (POST /api/users/[id]/reset-password).
//
// ADMIN ACCOUNTS: only an ADMIN can change, deactivate or promote to an
// ADMIN account. A SECRETARY also has users:write, and without this could
// make themselves an ADMIN.
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { userUpdateSchema } from "@/lib/validations";

function adminOnlyError(actorRole: string, targetRole: string, becomingRole: string): ApiError | null {
  if (actorRole === "ADMIN") return null;
  if (targetRole === "ADMIN" || becomingRole === "ADMIN") {
    return new ApiError(403, "ADMIN_ONLY", "Only an Admin can change an Admin account or give someone the Admin role.");
  }
  return null;
}

async function wouldRemoveLastActiveAdmin(targetId: number, becomingRole: string, becomingActive: boolean): Promise<boolean> {
  if (becomingRole === "ADMIN" && becomingActive) return false; // still an active admin, nothing to check

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true, is_active: true } });
  if (!target || target.role !== "ADMIN" || !target.is_active) return false; // target wasn't an active admin to begin with

  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", is_active: true, id: { not: targetId } },
  });

  return otherActiveAdmins === 0;
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(idParam) },
    select: { id: true, username: true, full_name: true, position: true, role: true, is_active: true, created_at: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const raw = await req.json();
  if (raw && typeof raw === "object" && "password" in raw) {
    throw new ApiError(
      400,
      "PASSWORD_VIA_RESET",
      "Passwords can't be set here. Use Reset password to issue a temporary password."
    );
  }
  const body = userUpdateSchema.parse(raw);

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { role: true, is_active: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve to what the record will actually become after this PATCH —
  // body.role / body.is_active are optional (partial update), so an
  // omitted field means "leave as-is", not "clear it".
  const resolvedRole = body.role ?? existing.role;
  const resolvedIsActive = body.is_active ?? existing.is_active;

  const forbidden = adminOnlyError(auth.session.user.role, existing.role, resolvedRole);
  if (forbidden) throw forbidden;

  if (await wouldRemoveLastActiveAdmin(id, resolvedRole, resolvedIsActive)) {
    throw new ApiError(
      409,
      "LAST_ADMIN",
      "Can't change this account — it's the only active administrator. Promote another user to ADMIN first."
    );
  }

  const data: Prisma.UserUpdateInput = { role: resolvedRole, is_active: resolvedIsActive };
  // Name and position are optional; omitted means "leave as-is", "" clears.
  if (body.full_name !== undefined) data.full_name = body.full_name;
  if (body.position !== undefined) data.position = body.position;

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data,
      select: { id: true, username: true, full_name: true, position: true, role: true, is_active: true },
    });
    await logAudit(
      {
        user_id: parseInt(auth.session.user.id),
        action: "UPDATE",
        table_affected: "User",
        record_id: id,
        details: `Updated user ID: ${id}`,
      },
      tx
    );
    return updated;
  });

  return NextResponse.json(user);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:delete", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, is_active: true } });
  if (existing) {
    const forbidden = adminOnlyError(auth.session.user.role, existing.role, existing.role);
    if (forbidden) throw forbidden;
  }
  if (existing?.role === "ADMIN" && existing.is_active) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", is_active: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new ApiError(
        409,
        "LAST_ADMIN",
        "Can't deactivate this account — it's the only active administrator. Promote another user to ADMIN first."
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { is_active: false } });
    await logAudit(
      {
        user_id: parseInt(auth.session.user.id),
        action: "DEACTIVATE",
        table_affected: "User",
        record_id: id,
        details: `Deactivated user ID: ${id}`,
      },
      tx
    );
  });

  return NextResponse.json({ message: "User deactivated" });
});