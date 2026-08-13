// FILE: src/app/api/users/[id]/route.ts
//
// FIX: PATCH/DELETE here had no protection against removing the last
// active ADMIN — an ADMIN could demote their own account's role, or
// deactivate themselves (or the only other admin), with nothing checking
// whether that would leave the system with zero active ADMIN accounts.
// Since "users:write" itself is ADMIN-only (per src/lib/permission.ts,
// only ADMIN's wildcard `*` grants it), losing the last ADMIN means no
// one left in the app can grant it back — a full lockout recoverable only
// via direct DB access.
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
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { userUpdateSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

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
  const auth = await requirePermission("users:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(idParam) },
    select: { id: true, username: true, role: true, is_active: true, created_at: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = userUpdateSchema.parse(await req.json());

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

  if (await wouldRemoveLastActiveAdmin(id, resolvedRole, resolvedIsActive)) {
    throw new ApiError(
      409,
      "LAST_ADMIN",
      "Can't change this account — it's the only active administrator. Promote another user to ADMIN first."
    );
  }

  const data: any = { role: resolvedRole, is_active: resolvedIsActive };
  if (body.password) {
    data.password_hash = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, is_active: true },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "User",
    record_id: id,
    details: `Updated user ID: ${id}`,
  });

  return NextResponse.json(user);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("users:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, is_active: true } });
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

  await prisma.user.update({ where: { id }, data: { is_active: false } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DEACTIVATE",
    table_affected: "User",
    record_id: id,
    details: `Deactivated user ID: ${id}`,
  });

  return NextResponse.json({ message: "User deactivated" });
});