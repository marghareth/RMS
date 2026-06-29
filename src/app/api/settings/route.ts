import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET() {
  const auth = await requirePermission("settings:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const settings = await prisma.systemSetting.findMany();
const result = Object.fromEntries(
  settings.map((s: { key: string; value: string }) => [s.key, s.value])
);
return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission("settings:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  const updates = await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  return NextResponse.json(updates);
}