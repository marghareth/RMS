import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const certificate = await prisma.certificate.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      resident: true,
      issuer: { select: { id: true, username: true } },
    },
  });

  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(certificate);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("certificates:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const certificate = await prisma.certificate.update({
    where: { id: parseInt(params.id) },
    data: { purpose: body.purpose },
  });

  return NextResponse.json(certificate);
}