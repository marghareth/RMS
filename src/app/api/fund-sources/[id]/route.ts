// FILE: src/app/api/fund-sources/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { fundSourceUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("fund-sources:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const fundSource = await prisma.fundSource.findUnique({ where: { id } });
  if (!fundSource) throw new ApiError(404, "NOT_FOUND", "Fund source not found.");

  // Transaction History — every revenue and disbursement posted against
  // this fund source, merged into one chronological ledger the Fund
  // Sources detail page renders directly (positive = revenue, negative =
  // disbursement, matching how a real cashbook reads).
  const [revenues, disbursements] = await Promise.all([
    prisma.revenue.findMany({ where: { fund_source_id: id }, orderBy: { date: "desc" } }),
    prisma.disbursement.findMany({ where: { fund_source_id: id }, orderBy: { date: "desc" } }),
  ]);

  const transactions = [
    ...revenues.map((r: typeof revenues[number]) => ({
      id: `revenue-${r.id}`,
      type: "REVENUE" as const,
      date: r.date,
      amount: r.amount,
      description: r.source,
      or_number: r.or_number,
    })),
    ...disbursements.map((d: typeof disbursements[number]) => ({
      id: `disbursement-${d.id}`,
      type: "DISBURSEMENT" as const,
      date: d.date,
      amount: d.amount,
      description: d.payee,
      or_number: d.or_number,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ ...fundSource, transactions });
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("fund-sources:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = fundSourceUpdateSchema.parse(await req.json());

  // current_balance is a derived running total maintained by the
  // revenue/disbursement routes — never let a plain edit form overwrite it
  // directly, or it'll drift from the actual ledger.
  const { current_balance, ...editable } = body;

  const fundSource = await prisma.fundSource.update({ where: { id }, data: editable });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "FundSource",
    record_id: id,
    details: `Updated fund source: ${fundSource.name}`,
  });

  return NextResponse.json(fundSource);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("fund-sources:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const [appropriationCount, revenueCount, disbursementCount] = await Promise.all([
    prisma.appropriation.count({ where: { fund_source_id: id } }),
    prisma.revenue.count({ where: { fund_source_id: id } }),
    prisma.disbursement.count({ where: { fund_source_id: id } }),
  ]);
  const linked = appropriationCount + revenueCount + disbursementCount;
  if (linked > 0) {
    throw new ApiError(
      409,
      "HAS_DEPENDENTS",
      `Cannot delete this fund source — it is still referenced by ${linked} record(s) (appropriations, revenues, or disbursements). Reassign or remove those first.`
    );
  }

  const fundSource = await prisma.fundSource.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "FundSource",
    record_id: id,
    details: `Deleted fund source: ${fundSource.name}`,
  });

  return NextResponse.json({ message: "Fund source deleted successfully" });
});