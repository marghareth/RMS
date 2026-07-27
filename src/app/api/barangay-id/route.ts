// FILE: src/app/api/barangay-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { barangayIdCreateSchema, paginationSchema } from "@/lib/validations";

function generateIdNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BID-${year}-${random}`;
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("barangay_id:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = resident_id ? { resident_id: parseInt(resident_id) } : {};

  const [ids, total] = await Promise.all([
    prisma.barangayId.findMany({
      where,
      skip,
      take: limit,
      include: {
        resident: { include: { purok: true, household: true } },
        issuer: { select: { id: true, username: true } },
      },
      orderBy: { issued_date: "desc" },
    }),
    prisma.barangayId.count({ where }),
  ]);

  return NextResponse.json({ ids, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("barangay_id:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = barangayIdCreateSchema.parse(await req.json());

  const resident = await prisma.resident.findUnique({ where: { id: body.resident_id } });
  if (!resident) {
    throw new ApiError(404, "NOT_FOUND", "Resident not found");
  }

  // A resident should only hold one barangay ID at a time. resident_id isn't
  // @unique on the model, so this has to be enforced here rather than by a
  // DB constraint.
  const existing = await prisma.barangayId.findFirst({ where: { resident_id: body.resident_id } });
  if (existing) {
    return NextResponse.json(
      { error: "DUPLICATE_ID", message: "This resident already has a barangay ID on file." },
      { status: 409 }
    );
  }

  let id_number = generateIdNumber();
  while (await prisma.barangayId.findUnique({ where: { id_number } })) {
    id_number = generateIdNumber();
  }

  const barangayId = await prisma.barangayId.create({
    data: {
      resident_id: body.resident_id,
      id_number,
      issued_by: parseInt(auth.session.user.id),
    },
    include: {
      resident: { include: { purok: true, household: true } },
      issuer: { select: { id: true, username: true } },
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "BarangayId",
    record_id: barangayId.id,
    details: `Generated barangay ID: ${id_number}`,
  });

  return NextResponse.json(barangayId, { status: 201 });
});