// FILE: src/app/api/fund-sources/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { fundSourceCreateSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("fund-sources:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  const where: any = {
    AND: [
      status ? { status } : {},
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const fundSources = await prisma.fundSource.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(fundSources);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("fund-sources:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = fundSourceCreateSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);

  const fundSource = await prisma.fundSource.create({
    data: {
      name: body.name,
      code: body.code ?? null,
      statutory_rule: body.statutory_rule ?? null,
      status: body.status ?? "ACTIVE",
      original_balance: body.original_balance ?? null,
      // A fund source starts its ledger at its original balance — every
      // Revenue/Disbursement posted against it afterward adjusts this same
      // running total (see revenues/route.ts and disbursements/route.ts).
      current_balance: body.original_balance ?? 0,
      recorded_by: userId,
    },
  });

  await logAudit({
    user_id: userId,
    action: "CREATE",
    table_affected: "FundSource",
    record_id: fundSource.id,
    details: `Added fund source: ${fundSource.name}`,
  });

  return NextResponse.json(fundSource, { status: 201 });
});