import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET() {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalResidents,
    totalHouseholds,
    activeCases,
    borrowedEquipment,
    certsThisMonth,
    certsThisYear,
    residentsByPurok,
    residentsBySex,
    recentActivity,
  ] = await Promise.all([
    prisma.resident.count({ where: { is_archived: false } }),
    prisma.household.count(),
    prisma.blotterCase.count({ where: { status: { in: ["FILED", "ONGOING"] } } }),
    prisma.equipmentBorrowing.count({ where: { actual_return: null } }),
    prisma.certificate.count({ where: { issued_at: { gte: startOfMonth } } }),
    prisma.certificate.count({ where: { issued_at: { gte: startOfYear } } }),
    prisma.resident.groupBy({
      by: ["purok_id"],
      where: { is_archived: false },
      _count: true,
    }),
    prisma.resident.groupBy({
      by: ["sex"],
      where: { is_archived: false },
      _count: true,
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { performed_at: "desc" },
      include: { user: { select: { username: true } } },
    }),
  ]);

  return NextResponse.json({
    totalResidents,
    totalHouseholds,
    activeCases,
    borrowedEquipment,
    certsThisMonth,
    certsThisYear,
    residentsByPurok,
    residentsBySex,
    recentActivity,
  });
}