// FILE: src/app/api/certificates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { certificateCreateSchema, paginationSchema } from "@/lib/validations";

// ── Generate certificate number e.g. CERT-2026-000123 ─────────────────────
async function generateCertificateNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.certificate.count({
    where: {
      issued_at: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  return `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const certificate_type = searchParams.get("certificate_type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      resident_id ? { resident_id: parseInt(resident_id) } : {},
      certificate_type ? { certificate_type } : {},
      date_from ? { issued_at: { gte: new Date(date_from) } } : {},
      date_to ? { issued_at: { lte: new Date(date_to) } } : {},
    ],
  };

  const [certificates, total] = await Promise.all([
    prisma.certificate.findMany({
      where,
      skip,
      take: limit,
      include: {
        resident: { include: { purok: true, household: true } },
        issuer: { select: { id: true, username: true, role: true } },
      },
      orderBy: { issued_at: "desc" },
    }),
    prisma.certificate.count({ where }),
  ]);

  return NextResponse.json({ certificates, total, page, limit });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("certificates:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = certificateCreateSchema.parse(await req.json());

  // 6-month residency check
  if (body.resident_id) {
    const resident = await prisma.resident.findUnique({
      where: { id: body.resident_id },
    });

    if (!resident) {
      throw new ApiError(404, "NOT_FOUND", "Resident not found");
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (resident.created_at > sixMonthsAgo) {
      throw new ApiError(
        400,
        "RESIDENCY_CHECK_FAILED",
        "Resident has not been in the barangay for at least 6 months."
      );
    }

    // duplicate certificate check within 30 days
    const recentCert = await prisma.certificate.findFirst({
      where: {
        resident_id: body.resident_id,
        certificate_type: body.certificate_type,
        issued_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentCert) {
      return NextResponse.json(
        { error: "DUPLICATE_CERT", message: "Same certificate type was issued to this resident within the last 30 days.", recent: recentCert },
        { status: 409 }
      );
    }
  }

  let certificate_no = await generateCertificateNo();
  while (await prisma.certificate.findUnique({ where: { certificate_no } })) {
    // Extremely unlikely race between the count check and the insert below —
    // append a short random suffix so we never loop forever on a collision.
    certificate_no = `${certificate_no}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const certificate = await prisma.certificate.create({
    data: {
      certificate_no,
      resident_id: body.resident_id ?? null,
      issued_by: parseInt(auth.session.user.id),
      certificate_type: body.certificate_type,
      purpose: body.purpose,
      flagged_manual: body.flagged_manual ?? false,
      manual_name: body.manual_name ?? null,
      manual_address: body.manual_address ?? null,
    },
    include: {
      resident: { include: { purok: true, household: true } },
      issuer: { select: { id: true, username: true } },
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "Certificate",
    record_id: certificate.id,
    details: `Issued ${certificate.certificate_type} certificate: ${certificate.certificate_no}`,
  });

  return NextResponse.json(certificate, { status: 201 });
});