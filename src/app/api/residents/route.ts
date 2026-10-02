// FILE: src/app/api/residents/route.ts
import type { Prisma, CivilStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import {
  DuplicateIndex,
  DUPLICATE_SELECT,
  candidateWhere,
  toMatchInfo,
  describeMatch,
} from "@/lib/duplicate-detection";
import { withErrorHandling } from "@/lib/api-handler";
import { residentCreateSchema, paginationSchema } from "@/lib/validations";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search       = searchParams.get("search") || "";
  const purok_id     = searchParams.get("purok_id");
  const sex          = searchParams.get("sex");
  const civil_status = searchParams.get("civil_status");
  const is_archived  = searchParams.get("is_archived") === "true";
  const unassigned   = searchParams.get("unassigned") === "true";
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: Prisma.ResidentWhereInput = {
    is_archived,
    AND: [
      search
        ? {
            OR: [
              { fname: { contains: search, mode: "insensitive" } },
              { lname: { contains: search, mode: "insensitive" } },
              { mname: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      purok_id     ? { purok_id:     parseInt(purok_id) } : {},
      sex          ? { sex }                              : {},
      civil_status ? { civil_status: civil_status as CivilStatus } : {},
      unassigned   ? { household_id: null }                : {},
    ],
  };

  const [residents, total] = await Promise.all([
    prisma.resident.findMany({
      where,
      skip,
      take: limit,
      include: {
        purok: true,
        household: true,
      },
      orderBy: { lname: "asc" },
    }),
    prisma.resident.count({ where }),
  ]);

  return NextResponse.json({ residents, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const raw = await req.json();
  // Not part of the resident record (the schema strips it) — it is the
  // user's explicit "yes, this really is a different person" answer to a
  // POSSIBLE_DUPLICATE warning.
  const confirmedPossible = raw?.confirm_possible_duplicate === true;
  const body = residentCreateSchema.parse(raw);

  // Duplicate check (src/lib/duplicate-detection.ts). Only people who could
  // plausibly match are loaded; the real decision is made in memory.
  const candidates = await prisma.resident.findMany({
    where: candidateWhere(body),
    select: DUPLICATE_SELECT,
  });
  const hits = new DuplicateIndex(candidates).find(body);

  // Same person after normalization -> hard block, no override.
  const exact = hits.find((h) => h.level === "EXACT");
  if (exact) {
    return NextResponse.json(
      {
        error:    "DUPLICATE",
        message:  "A resident with the same name and birthdate already exists.",
        existing: exact.record,
      },
      { status: 409 }
    );
  }

  // Looks like someone already on file -> ask the user, who may confirm.
  const possible = hits.filter((h) => h.level === "POSSIBLE");
  if (possible.length > 0 && !confirmedPossible) {
    const matches = possible.map(toMatchInfo);
    return NextResponse.json(
      {
        error:   "POSSIBLE_DUPLICATE",
        message: `This resident looks similar to someone already on file: ${matches.map(describeMatch).join("; ")}. Check before saving.`,
        matches,
      },
      { status: 409 }
    );
  }

  const resident = await prisma.resident.create({ data: body });

  await logAudit({
    user_id:        parseInt(auth.session.user.id),
    action:         "CREATE",
    table_affected: "Resident",
    record_id:      resident.id,
    // Keep a trail of overrides: who accepted a possible duplicate, and of whom.
    details:        possible.length > 0
      ? `Created resident: ${resident.fname} ${resident.lname} (confirmed possible duplicate of ${possible.map((h) => `#${h.record.id}`).join(", ")})`
      : `Created resident: ${resident.fname} ${resident.lname}`,
  });

  return NextResponse.json(resident, { status: 201 });
});