// FILE: src/app/api/certificates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { certificateCreateSchema, paginationSchema } from "@/lib/validations";

// ── Generate certificate number e.g. CERT-2026-000123 ─────────────────────
// Keyed off `requested_at` rather than `issued_at` — `issued_at` is now only
// set once a request is actually RELEASED (see Document Request Workflow),
// so counting by it would undercount pending/processing requests and risk
// certificate_no collisions.
async function generateCertificateNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.certificate.count({
    where: {
      requested_at: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  return `CERT-${year}-${String(count + 1).padStart(6, "0")}`;
}

// ── Generate queue number e.g. Q-2026-0001 — same year-scoped counting
// approach as certificate_no, kept as a separate sequence/prefix so front
// desk staff can call out "Q-2026-0001" without it being confused for the
// certificate_no that ends up printed on the document itself.
async function generateQueueNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.certificate.count({
    where: {
      requested_at: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  return `Q-${year}-${String(count + 1).padStart(4, "0")}`;
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const certificate_type = searchParams.get("certificate_type");
  const status = searchParams.get("status");
  const payment_status = searchParams.get("payment_status");
  const search = searchParams.get("search") || "";
  // Queue-oriented date range (when the request came in) vs. release-oriented
  // range (when it was actually handed out) — kept as separate query params
  // since `issued_at` is null until RELEASED and the two pages that consume
  // this endpoint (Document Queue vs. Document Release) care about different
  // moments in the same record's lifecycle.
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const released_from = searchParams.get("released_from");
  const released_to = searchParams.get("released_to");
  const { page, limit } = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const skip = (page - 1) * limit;

  const where: any = {
    AND: [
      resident_id ? { resident_id: parseInt(resident_id) } : {},
      certificate_type ? { certificate_type } : {},
      status ? { status } : {},
      payment_status ? { payment_status } : {},
      date_from ? { requested_at: { gte: new Date(date_from) } } : {},
      date_to ? { requested_at: { lte: new Date(date_to) } } : {},
      released_from ? { issued_at: { gte: new Date(released_from) } } : {},
      released_to ? { issued_at: { lte: new Date(released_to) } } : {},
      search
        ? {
            OR: [
              { certificate_no: { contains: search, mode: "insensitive" } },
              { queue_number: { contains: search, mode: "insensitive" } },
              { manual_name: { contains: search, mode: "insensitive" } },
              { resident: { fname: { contains: search, mode: "insensitive" } } },
              { resident: { lname: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {},
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
      orderBy: { requested_at: "desc" },
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

    // duplicate certificate check within 30 days — checked against
    // requested_at so a same-day duplicate is still caught even before the
    // earlier request has been released (issued_at would still be null then).
    const recentCert = await prisma.certificate.findFirst({
      where: {
        resident_id: body.resident_id,
        certificate_type: body.certificate_type,
        requested_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
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

  let queue_number = await generateQueueNumber();
  while (await prisma.certificate.findUnique({ where: { queue_number } })) {
    queue_number = `${queue_number}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const certificate = await prisma.certificate.create({
    data: {
      certificate_no,
      queue_number,
      resident_id: body.resident_id ?? null,
      issued_by: parseInt(auth.session.user.id),
      certificate_type: body.certificate_type,
      purpose: body.purpose,
      flagged_manual: body.flagged_manual ?? false,
      manual_name: body.manual_name ?? null,
      manual_address: body.manual_address ?? null,
      // status/payment_status/requested_at all take their schema defaults
      // (PENDING/PENDING/now()) — a new request always starts in the queue.
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