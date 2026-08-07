// FILE: src/app/api/revenues/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { revenueUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("revenues:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const revenue = await prisma.revenue.findUnique({
    where: { id },
    include: { fund_source: { select: { id: true, name: true } } },
  });
  if (!revenue) throw new ApiError(404, "NOT_FOUND", "Revenue not found.");

  return NextResponse.json(revenue);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("revenues:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = revenueUpdateSchema.parse(await req.json());

  const existing = await prisma.revenue.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Revenue not found.");

  const newAmount = body.amount ?? Number(existing.amount);
  const newFundSourceId = "fund_source_id" in body ? body.fund_source_id ?? null : existing.fund_source_id;
  const oldFundSourceId = existing.fund_source_id;
  const oldAmount = Number(existing.amount);

  const ops = [
    prisma.revenue.update({
      where: { id },
      data: { ...body },
      include: { fund_source: { select: { id: true, name: true } } },
    }),
  ];

  // Reverse the old fund source's balance impact and apply the new one —
  // handles amount changes, fund source reassignment, or both, without
  // ever double-counting.
  if (oldFundSourceId === newFundSourceId) {
    const delta = newAmount - oldAmount;
    if (oldFundSourceId && delta !== 0) {
      ops.push(prisma.fundSource.update({
        where: { id: oldFundSourceId },
        data: { current_balance: { increment: delta } },
      }) as any);
    }
  } else {
    if (oldFundSourceId) {
      ops.push(prisma.fundSource.update({
        where: { id: oldFundSourceId },
        data: { current_balance: { decrement: oldAmount } },
      }) as any);
    }
    if (newFundSourceId) {
      ops.push(prisma.fundSource.update({
        where: { id: newFundSourceId },
        data: { current_balance: { increment: newAmount } },
      }) as any);
    }
  }

  const [revenue] = await prisma.$transaction(ops as any);

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Revenue",
    record_id: id,
    details: `Updated revenue: ${(revenue as any).source}`,
  });

  return NextResponse.json(revenue);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("revenues:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.revenue.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Revenue not found.");

  await prisma.$transaction([
    prisma.revenue.delete({ where: { id } }),
    ...(existing.fund_source_id
      ? [prisma.fundSource.update({
          where: { id: existing.fund_source_id },
          data: { current_balance: { decrement: Number(existing.amount) } },
        })]
      : []),
  ]);

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "Revenue",
    record_id: id,
    details: `Deleted revenue: ${existing.source}`,
  });

  return NextResponse.json({ message: "Revenue deleted successfully" });
});