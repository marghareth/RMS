import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("reports:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");

  const dateFilter = {
    ...(date_from && { gte: new Date(date_from) }),
    ...(date_to && { lte: new Date(date_to) }),
  };

  switch (type) {
    case "population": {
      const [total, byPurok, bySex, byAgeGroup] = await Promise.all([
        prisma.resident.count({ where: { is_archived: false } }),
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
        prisma.resident.findMany({
          where: { is_archived: false },
          select: { birthdate: true },
        }),
      ]);

      const ageGroups = { "0-17": 0, "18-59": 0, "60+": 0 };
      const now = new Date();
      byAgeGroup.forEach((r: { birthdate: Date }) => {
        const age = now.getFullYear() - new Date(r.birthdate).getFullYear();
        if (age < 18) ageGroups["0-17"]++;
        else if (age < 60) ageGroups["18-59"]++;
        else ageGroups["60+"]++;
      });

      return NextResponse.json({ total, byPurok, bySex, ageGroups });
    }

    case "certificates": {
      const [total, byType] = await Promise.all([
        prisma.certificate.count({
          where: Object.keys(dateFilter).length ? { issued_at: dateFilter } : {},
        }),
        prisma.certificate.groupBy({
          by: ["certificate_type"],
          where: Object.keys(dateFilter).length ? { issued_at: dateFilter } : {},
          _count: true,
        }),
      ]);
      return NextResponse.json({ total, byType });
    }

    case "blotter": {
      const [total, byStatus] = await Promise.all([
        prisma.blotterCase.count({
          where: Object.keys(dateFilter).length ? { created_at: dateFilter } : {},
        }),
        prisma.blotterCase.groupBy({
          by: ["status"],
          where: Object.keys(dateFilter).length ? { created_at: dateFilter } : {},
          _count: true,
        }),
      ]);
      return NextResponse.json({ total, byStatus });
    }

    case "financial": {
      const summary = await prisma.financialRecord.groupBy({
        by: ["transaction_type"],
        where: Object.keys(dateFilter).length ? { transaction_date: dateFilter } : {},
        _sum: { amount: true },
        _count: true,
      });
      return NextResponse.json(summary);
    }

    case "inventory": {
      const [total, byStatus] = await Promise.all([
        prisma.equipment.count(),
        prisma.equipment.groupBy({
          by: ["status"],
          _count: true,
          _sum: { quantity: true },
        }),
      ]);
      return NextResponse.json({ total, byStatus });
    }

    case "registries": {
      const byType = await prisma.specialRegistry.groupBy({
        by: ["registry_type"],
        _count: true,
      });
      return NextResponse.json(byType);
    }

    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
}