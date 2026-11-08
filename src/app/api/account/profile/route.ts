// FILE: src/app/api/account/profile/route.ts
//
// The signed-in user's own name and position (Nov 2026).
//   GET   → { username, role, full_name, position }
//   PATCH { full_name?, position? } → same shape
// Printed on the "Prepared by" line of printed reports
// (src/components/layout/PrintDocument.tsx) and edited on Account › Your
// name. Any signed-in user may read and change their own; Admins can also
// set them for others on Admin › Users.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";

const select = { username: true, role: true, full_name: true, position: true } as const;

const optionalName = z
  .string()
  .trim()
  .max(100, "Keep it under 100 characters")
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? v : null));
const patchSchema = z.object({ full_name: optionalName, position: optionalName });

export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({ where: { id: parseInt(auth.session.user.id) }, select });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = patchSchema.parse(await req.json());
  const id = parseInt(auth.session.user.id);
  const data: { full_name?: string | null; position?: string | null } = {};
  if (body.full_name !== undefined) data.full_name = body.full_name;
  if (body.position !== undefined) data.position = body.position;

  const user = await prisma.user.update({ where: { id }, data, select });
  await logAudit({
    user_id: id,
    action: "UPDATE",
    table_affected: "User",
    record_id: id,
    details: "Updated own name and position",
  });
  return NextResponse.json(user);
});