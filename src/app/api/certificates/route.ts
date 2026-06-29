import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const resident_id = searchParams.get("resident_id");
  const certificate_type = searchParams.get("certificate_type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
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
        resident: true,
        issuer: { select: { id: true, username: true, role: true } },
      },
      orderBy: { issued_at: "desc" },
    }),
    prisma.certificate.count({ where }),
  ]);

  return NextResponse.json({ certificates, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("certificates:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();

  // 6-month residency check
  if (body.resident_id) {
    const resident = await prisma.resident.findUnique({
      where: { id: body.resident_id },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (resident.created_at > sixMonthsAgo) {
      return NextResponse.json(
        { error: "RESIDENCY_CHECK_FAILED", message: "Resident has not been in the barangay for at least 6 months." },
        { status: 400 }
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

  const certificate = await prisma.certificate.create({
    data: {
      resident_id: body.resident_id || null,
      issued_by: parseInt(auth.session.user.id),
      certificate_type: body.certificate_type,
      purpose: body.purpose,
      flagged_manual: body.flagged_manual || false,
      manual_name: body.manual_name || null,
      manual_address: body.manual_address || null,
    },
    include: {
      resident: true,
      issuer: { select: { id: true, username: true } },
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "CREATE",
    table_affected: "Certificate",
    record_id: certificate.id,
    details: `Issued ${certificate.certificate_type} certificate`,
  });

  return NextResponse.json(certificate, { status: 201 });
}