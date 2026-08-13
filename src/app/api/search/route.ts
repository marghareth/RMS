// FILE: src/app/api/search/route.ts
//
// SECURITY FIX: this endpoint was gated by a single
// `requirePermission("residents:read")` check, but returned certificate
// and blotter-case matches too — both of which require their own
// permissions ("certificates:read" / "blotter:read") elsewhere in the
// app. BHW, for example, has "residents:read" but neither
// "certificates:read" nor "blotter:read" — yet global search still
// handed back certificate records and blotter case numbers/complainant
// names to that role.
//
// Fix: require authentication + at least one relevant permission to use
// the endpoint at all, then only query/return each category if the
// caller's role actually holds the permission for it. Categories the
// role can't see come back as an empty array, matching the existing
// "q.length < 2" short-circuit shape below.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/permission";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const role = (auth.session.user as any)?.role as string;
  const canReadResidents = hasPermission(role, "residents:read");
  const canReadCertificates = hasPermission(role, "certificates:read");
  const canReadBlotter = hasPermission(role, "blotter:read");

  // Nothing this endpoint can ever return for this role — treat like a
  // 403 rather than silently returning three empty arrays forever.
  if (!canReadResidents && !canReadCertificates && !canReadBlotter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (q.length < 2) {
    return NextResponse.json({ residents: [], certificates: [], blotter: [] });
  }

  const [residents, certificates, blotter] = await Promise.all([
    canReadResidents
      ? prisma.resident.findMany({
          where: {
            is_archived: false,
            OR: [
              { fname: { contains: q, mode: "insensitive" } },
              { lname: { contains: q, mode: "insensitive" } },
              { mname: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: { id: true, fname: true, lname: true, mname: true, purok: true },
        })
      : Promise.resolve([]),
    canReadCertificates
      ? prisma.certificate.findMany({
          where: {
            OR: [
              { manual_name: { contains: q, mode: "insensitive" } },
              { resident: { fname: { contains: q, mode: "insensitive" } } },
              { resident: { lname: { contains: q, mode: "insensitive" } } },
            ],
          },
          take: 5,
          include: { resident: { select: { fname: true, lname: true } } },
        })
      : Promise.resolve([]),
    canReadBlotter
      ? prisma.blotterCase.findMany({
          where: {
            OR: [
              { case_number: { contains: q, mode: "insensitive" } },
              { complainant_name: { contains: q, mode: "insensitive" } },
              { respondent_name: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: { id: true, case_number: true, complainant_name: true, respondent_name: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ residents, certificates, blotter });
}