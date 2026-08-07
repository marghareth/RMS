// FILE: src/app/api/visitor-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { visitorLogCreateSchema, paginationSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("visitors:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search") || "";
  const status    = searchParams.get("status"); // "active" | "checked_out"
  const date_from = searchParams.get("date_from");
  const date_to   = searchParams.get("date_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      status === "active"       ? { time_out: null } : {},
      status === "checked_out"  ? { time_out: { not: null } } : {},
      date_from ? { time_in: { gte: new Date(date_from) } } : {},
      date_to   ? { time_in: { lte: new Date(date_to) } } : {},
      search
        ? {
            OR: [
              { visitor_name:    { contains: search, mode: "insensitive" } },
              { purpose:         { contains: search, mode: "insensitive" } },
              { person_to_visit: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.visitorLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { time_in: "desc" },
    }),
    prisma.visitorLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("visitors:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = visitorLogCreateSchema.parse(await req.json());

  const visitor = await prisma.visitorLog.create({
    data: {
      visitor_name:    body.visitor_name,
      contact:         body.contact ?? null,
      purpose:         body.purpose,
      person_to_visit: body.person_to_visit ?? null,
      recorded_by:     parseInt(auth.session.user.id),
    },
  });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "CREATE",
    table_affected: "VisitorLog",
    record_id:      visitor.id,
    details:        `Logged visitor: ${visitor.visitor_name}`,
  });

  return NextResponse.json(visitor, { status: 201 });
});