// FILE: src/app/api/certificates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { z } from "zod";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context!.params;
  const certificate = await prisma.certificate.findUnique({
    where: { id: parseInt(id) },
    include: {
      resident: { include: { purok: true, household: true } },
      issuer: { select: { id: true, username: true } },
    },
  });

  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(certificate);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context!.params;
  const body = z.object({ purpose: z.string().trim().min(1, "Required") }).parse(await req.json());

  const certificate = await prisma.certificate.update({
    where: { id: parseInt(id) },
    data: { purpose: body.purpose },
  });

  return NextResponse.json(certificate);
});