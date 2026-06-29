import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (q.length < 2) {
    return NextResponse.json({ residents: [], certificates: [], blotter: [] });
  }

  const [residents, certificates, blotter] = await Promise.all([
    prisma.resident.findMany({
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
    }),
    prisma.certificate.findMany({
      where: {
        OR: [
          { manual_name: { contains: q, mode: "insensitive" } },
          { resident: { fname: { contains: q, mode: "insensitive" } } },
          { resident: { lname: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      include: { resident: { select: { fname: true, lname: true } } },
    }),
    prisma.blotterCase.findMany({
      where: {
        OR: [
          { case_number: { contains: q, mode: "insensitive" } },
          { complainant_name: { contains: q, mode: "insensitive" } },
          { respondent_name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, case_number: true, complainant_name: true, respondent_name: true, status: true },
    }),
  ]);

  return NextResponse.json({ residents, certificates, blotter });
}