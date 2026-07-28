// FILE: src/app/api/puroks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { purokCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async () => {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const puroks = await prisma.purok.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { residents: true, households: true } },
    },
  });
  return NextResponse.json(puroks);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("settings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = purokCreateSchema.parse(await req.json());
  const purok = await prisma.purok.create({ data: { name: body.name } });
  return NextResponse.json(purok, { status: 201 });
});