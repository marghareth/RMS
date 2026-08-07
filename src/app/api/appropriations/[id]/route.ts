// FILE: src/app/api/appropriations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { appropriationUpdateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("appropriations:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const appropriation = await prisma.appropriation.findUnique({
    where: { id },
    include: {
      fund_source: { select: { id: true, name: true } },
      disbursements: { orderBy: { date: "desc" } },
    },
  });
  if (!appropriation) throw new ApiError(404, "NOT_FOUND", "Appropriation not found.");

  return NextResponse.json(appropriation);
});

export const PATCH = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("appropriations:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  const body = appropriationUpdateSchema.parse(await req.json());

  // disbursed_amount is a derived running total maintained by
  // disbursements/route.ts (see its create/delete handlers) — never let a
  // plain edit form overwrite it directly, or it'll drift from the actual
  // disbursement ledger.
  const { disbursed_amount, ...editable } = body;

  const appropriation = await prisma.appropriation.update({
    where: { id },
    data: editable,
    include: { fund_source: { select: { id: true, name: true } } },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "UPDATE",
    table_affected: "Appropriation",
    record_id: id,
    details: `Updated appropriation: ${appropriation.item_name}`,
  });

  return NextResponse.json(appropriation);
});

export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("appropriations:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const disbursementCount = await prisma.disbursement.count({ where: { appropriation_id: id } });
  if (disbursementCount > 0) {
    throw new ApiError(
      409,
      "HAS_DEPENDENTS",
      `Cannot delete this appropriation — it has ${disbursementCount} disbursement(s) recorded against it.`
    );
  }

  const appropriation = await prisma.appropriation.delete({ where: { id } });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "DELETE",
    table_affected: "Appropriation",
    record_id: id,
    details: `Deleted appropriation: ${appropriation.item_name}`,
  });

  return NextResponse.json({ message: "Appropriation deleted successfully" });
});