// FILE: src/app/api/users/reset-requests/route.ts
//
// GET — "Forgot password?" requests still waiting for an Admin or
// Secretary. A request lapses after 24 hours (RESET_REQUEST_TTL_MS) and is
// simply no longer listed; the person can send a new one.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { RESET_REQUEST_TTL_MS } from "@/lib/password-policy";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("users:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const since = new Date(Date.now() - RESET_REQUEST_TTL_MS);
  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: "PENDING", requested_at: { gt: since }, user: { is_active: true } },
    orderBy: { requested_at: "asc" },
    select: {
      id: true,
      requested_at: true,
      user: { select: { id: true, username: true, role: true } },
    },
  });

  return NextResponse.json(requests);
});