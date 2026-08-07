// FILE: src/app/api/disbursements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { disbursementUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("disbursements:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const disbursement = await prisma.disbursement.findUnique({
    where: { id },
    include: {
      fund_source: { select: { id: true, name: true } },
      appropriation: { select: { id: true, item_name: true, category: true } },
    },
  });
  if (!disbursement) throw new ApiError(404, "NOT_FOUND", "Disbursement not found.");

  return NextResponse.json(disbursement);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("disbursements:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = disbursementUpdateSchema.parse(await req.json());

  const existing = await prisma.disbursement.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Disbursement not found.");

  const newAmount = body.amount ?? Number(existing.amount);
  const oldAmount = Number(existing.amount);

  const newFundSourceId = "fund_source_id" in body ? body.fund_source_id ?? null : existing.fund_source_id;
  const newAppropriationId = "appropriation_id" in body ? body.appropriation_id ?? null : existing.appropriation_id;

  const ops: any[] = [
    prisma.disbursement.update({
      where: { id },
      data: { ...body },
      include: {
        fund_source: { select: { id: true, name: true } },
        appropriation: { select: { id: true, item_name: true, category: true } },
      },
    }),
  ];

  // Fund source balance: reverse old impact, apply new — same
  // reassignment-safe delta pattern as revenues/[id]/route.ts.
  if (existing.fund_source_id === newFundSourceId) {
    const delta = newAmount - oldAmount;
    if (existing.fund_source_id && delta !== 0) {
      ops.push(prisma.fundSource.update({
        where: { id: existing.fund_source_id },
        data: { current_balance: { decrement: delta } },
      }));
    }
  } else {
    if (existing.fund_source_id) {
      ops.push(prisma.fundSource.update({
        where: { id: existing.fund_source_id },
        data: { current_balance: { increment: oldAmount } },
      }));
    }
    if (newFundSourceId) {
      ops.push(prisma.fundSource.update({
        where: { id: newFundSourceId },
        data: { current_balance: { decrement: newAmount } },
      }));
    }
  }

  // Appropriation disbursed_amount: same reversal/reapply pattern.
  if (existing.appropriation_id === newAppropriationId) {
    const delta = newAmount - oldAmount;
    if (existing.appropriation_id && delta !== 0) {
      ops.push(prisma.appropriation.update({
        where: { id: existing.appropriation_id },
        data: { disbursed_amount: { increment: delta } },
      }));
    }
  } else {
    if (existing.appropriation_id) {
      ops.push(prisma.appropriation.update({
        where: { id: existing.appropriation_id },
        data: { disbursed_amount: { decrement: oldAmount } },
      }));
    }
    if (newAppropriationId) {
      ops.push(prisma.appropriation.update({
        where: { id: newAppropriationId },
        data: { disbursed_amount: { increment: newAmount } },
      }));
    }
  }

  const [disbursement] = await prisma.$transaction(ops);

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Disbursement",
    record_id: id,
    details: `Updated disbursement: ${(disbursement as any).payee}`,
  });

  return NextResponse.json(disbursement);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("disbursements:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const existing = await prisma.disbursement.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Disbursement not found.");

  const ops: any[] = [prisma.disbursement.delete({ where: { id } })];
  if (existing.fund_source_id) {
    ops.push(prisma.fundSource.update({
      where: { id: existing.fund_source_id },
      data: { current_balance: { increment: Number(existing.amount) } },
    }));
  }
  if (existing.appropriation_id) {
    ops.push(prisma.appropriation.update({
      where: { id: existing.appropriation_id },
      data: { disbursed_amount: { decrement: Number(existing.amount) } },
    }));
  }

  await prisma.$transaction(ops);

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "Disbursement",
    record_id: id,
    details: `Deleted disbursement: ${existing.payee}`,
  });

  return NextResponse.json({ message: "Disbursement deleted successfully" });
});