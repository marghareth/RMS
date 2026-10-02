// FILE: src/app/api/residents/duplicate-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { residentDuplicateCheckSchema } from "@/lib/validations";
import { withErrorHandling } from "@/lib/api-handler";
import {
  DuplicateIndex,
  DUPLICATE_SELECT,
  candidateWhere,
  toMatchInfo,
  type DuplicateLevel,
  type DuplicateReason,
  type ResidentIdentity,
} from "@/lib/duplicate-detection";

// POST — dry run. Takes the people about to be created (the "Add Household"
// form's members) and reports which already exist, or repeat each other,
// WITHOUT writing anything. The form calls this before it creates the
// household so a duplicate is caught up front. Previously the household was
// created first and the duplicate only discovered when saving a member,
// leaving an empty household behind.
//
// Response: { hasExact, hasPossible, results: [{ index, exact, possible, batch }] }
//   exact    the existing resident this one duplicates (hard block), or null
//   possible existing residents it resembles (warning; user may confirm)
//   batch    other members of THIS request it duplicates / resembles
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { members } = residentDuplicateCheckSchema.parse(await req.json());

  // One query for everyone: union of each member's candidate filter.
  const candidates = await prisma.resident.findMany({
    where: { OR: members.map((m) => candidateWhere(m)) },
    select: DUPLICATE_SELECT,
  });
  const existingIndex = new DuplicateIndex(candidates);

  // Members are also checked against the ones above them in the list.
  type Member = ResidentIdentity & { index: number };
  const batchIndex = new DuplicateIndex<Member>();

  const results = members.map((member, index) => {
    const dbHits = existingIndex.find(member);
    const exact = dbHits.find((h) => h.level === "EXACT");

    const batch = batchIndex.find(member).map((h) => ({
      with: h.record.index,
      level: h.level as DuplicateLevel,
      reason: h.reason as DuplicateReason,
      label: h.label,
    }));
    batchIndex.add({ ...member, index });

    return {
      index,
      exact: exact ? toMatchInfo(exact) : null,
      possible: dbHits.filter((h) => h.level === "POSSIBLE").map(toMatchInfo),
      batch,
    };
  });

  return NextResponse.json({
    hasExact: results.some((r) => r.exact || r.batch.some((b) => b.level === "EXACT")),
    hasPossible: results.some((r) => r.possible.length > 0 || r.batch.some((b) => b.level === "POSSIBLE")),
    results,
  });
});