import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("audit:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const table_affected = searchParams.get("table_affected");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      user_id ? { user_id: parseInt(user_id) } : {},
      table_affected ? { table_affected } : {},
      date_from ? { performed_at: { gte: new Date(date_from) } } : {},
      date_to ? { performed_at: { lte: new Date(date_to) } } : {},
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: { user: { select: { id: true, username: true } } },
      orderBy: { performed_at: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}