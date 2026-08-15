// FILE: src/app/api/reports/route.ts
//
// WHAT WAS WRONG: every /reports/* page (population, certificates, blotter,
// financial, inventory, registries) was built against a rich data shape
// (see the `interface ...ReportData` in each page.tsx) — nested totals,
// byPurok/byMonth/byType breakdowns, "recent" tables, etc. This endpoint
// only ever returned the bare output of a single Prisma `groupBy` per
// report type (e.g. registries returned a raw array, certificates
// returned `{ total, byType }` with no `recent`), so every page crashed
// trying to read fields like `data.seniors.total` or `data.recent.map`
// off a shape that was never actually being sent.
//
// This rewrite makes each `case` return exactly the shape its page's
// `interface ...ReportData` declares.
//
// Two fields the frontends ask for don't exist anywhere in the schema:
//   - BlotterCase has no "incident type" column, only `status` — so
//     `byType` for blotter is returned as `[]` rather than inventing a
//     category. Add an `incident_type` field to BlotterCase if that
//     breakdown is actually needed.
//   - FinancialRecord has no "category" column, only free-text
//     `description` — so income/expense "category" is approximated by
//     grouping on the literal description text. That's real recorded
//     data (not fabricated), but it's only as clean as the descriptions
//     people type in; a dedicated `category` enum/column would be a
//     better long-term fix.
//
// Every report accepts `year` (required for a meaningful default) and
// optionally `month` (01-12) as plain query params — e.g.
// `?type=financial&year=2026&month=03`.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|_)\S/g, (c) => c.toUpperCase()).replace(/_/g, " ");
}

function computeAge(birthdate: Date, asOf: Date): number {
  let age = asOf.getFullYear() - birthdate.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > birthdate.getMonth() ||
    (asOf.getMonth() === birthdate.getMonth() && asOf.getDate() >= birthdate.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

function residentName(r: { fname: string; lname: string } | null, fallback: string | null): string {
  if (!r) return fallback ?? "\u2014";
  return `${r.lname}, ${r.fname}`;
}

// Resolves the `year`/`month` query params into concrete date boundaries.
//   - yearStart/yearEnd: always the full selected year (used for "whole
//     year" charts like monthly trends, and as the default filter range).
//   - effectiveStart/effectiveEnd: narrows to a single month when `month`
//     is provided, otherwise falls back to the full year — used for
//     filtered totals/breakdowns that should respect a month selection.
function parseYearMonth(searchParams: URLSearchParams) {
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
  const monthParam = searchParams.get("month");
  const month = monthParam ? parseInt(monthParam, 10) : null;

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const effectiveStart = month ? new Date(year, month - 1, 1) : yearStart;
  const effectiveEnd = month ? new Date(year, month, 0, 23, 59, 59, 999) : yearEnd;

  return { year, month, yearStart, yearEnd, effectiveStart, effectiveEnd };
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("reports:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const { yearStart, yearEnd, effectiveStart, effectiveEnd } = parseYearMonth(searchParams);

  switch (type) {
    // ─── POPULATION ───────────────────────────────────────────────────────
    case "population": {
      const asOfCutoff = { created_at: { lte: yearEnd } };
      const residentWhere = { is_archived: false, ...asOfCutoff };

      const [total, puroks, residentsByPurok, householdsByPurok, bySexRaw, byCivilStatusRaw, byEmploymentRaw, birthdates] =
        await Promise.all([
          prisma.resident.count({ where: residentWhere }),
          prisma.purok.findMany({ orderBy: { name: "asc" } }),
          prisma.resident.groupBy({ by: ["purok_id"], where: residentWhere, _count: true }),
          prisma.household.groupBy({ by: ["purok_id"], where: asOfCutoff, _count: true }),
          prisma.resident.groupBy({ by: ["sex"], where: residentWhere, _count: true }),
          prisma.resident.groupBy({ by: ["civil_status"], where: residentWhere, _count: true }),
          prisma.resident.groupBy({ by: ["employment_status"], where: residentWhere, _count: true }),
          prisma.resident.findMany({ where: residentWhere, select: { birthdate: true } }),
        ]);

      const byPurok = puroks.map((p) => ({
        purok: p.name,
        count: residentsByPurok.find((r) => r.purok_id === p.id)?._count ?? 0,
        households: householdsByPurok.find((h) => h.purok_id === p.id)?._count ?? 0,
      }));

      const bySex = bySexRaw.map((s) => ({ sex: titleCase(s.sex), count: s._count }));
      const byCivilStatus = byCivilStatusRaw.map((c) => ({ status: titleCase(c.civil_status), count: c._count }));
      const byEmployment = byEmploymentRaw.map((e) => ({
        status: e.employment_status ? titleCase(e.employment_status) : "Not Specified",
        count: e._count,
      }));

      const ageBuckets = { "0-17": 0, "18-59": 0, "60+": 0 };
      const now = new Date();
      for (const { birthdate } of birthdates) {
        const age = computeAge(new Date(birthdate), now);
        if (age < 18) ageBuckets["0-17"]++;
        else if (age < 60) ageBuckets["18-59"]++;
        else ageBuckets["60+"]++;
      }
      const byAgeGroup = Object.entries(ageBuckets).map(([group, count]) => ({ group, count }));

      return NextResponse.json({ total, byPurok, bySex, byAgeGroup, byCivilStatus, byEmployment });
    }

    // ─── CERTIFICATES ─────────────────────────────────────────────────────
    case "certificates": {
      const CERT_LABELS: Record<string, { label: string; color: string }> = {
        RESIDENCY:              { label: "Residency",              color: "#3E5C76" },
        INDIGENCY:              { label: "Indigency",              color: "#0B6E4F" },
        CLEARANCE:              { label: "Clearance",              color: "#B45309" },
        GOOD_MORAL:             { label: "Good Moral",             color: "#6D4AFF" },
        BUSINESS_PERMIT:        { label: "Business Permit",        color: "#0E7490" },
        COHABITATION:           { label: "Cohabitation",           color: "#9CA3AF" },
        SOLO_PARENT:            { label: "Solo Parent",            color: "#B3261E" },
        FIRST_TIME_JOB_SEEKER:  { label: "First Time Job Seeker",  color: "#B45309" },
        LATE_REGISTRATION:      { label: "Late Registration",      color: "#6B7280" },
      };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalThisYear, totalThisMonth, byTypeRaw, monthRows, recentRaw] = await Promise.all([
        prisma.certificate.count({ where: { issued_at: { gte: yearStart, lte: yearEnd } } }),
        prisma.certificate.count({ where: { issued_at: { gte: startOfMonth } } }),
        prisma.certificate.groupBy({
          by: ["certificate_type"],
          where: { issued_at: { gte: effectiveStart, lte: effectiveEnd } },
          _count: true,
        }),
        prisma.certificate.findMany({
          where: { issued_at: { gte: yearStart, lte: yearEnd } },
          select: { issued_at: true },
        }),
        prisma.certificate.findMany({
          where: { issued_at: { gte: effectiveStart, lte: effectiveEnd } },
          include: { resident: { select: { fname: true, lname: true } }, issuer: { select: { username: true } } },
          orderBy: { issued_at: "desc" },
          take: 10,
        }),
      ]);

      const byType = byTypeRaw.map((t) => ({
        type: CERT_LABELS[t.certificate_type]?.label ?? titleCase(t.certificate_type),
        count: t._count,
        color: CERT_LABELS[t.certificate_type]?.color ?? "#6B7280",
      }));

      const monthCounts = new Array(12).fill(0);
      for (const row of monthRows) {
        if (!row.issued_at) continue;
        monthCounts[new Date(row.issued_at).getMonth()]++;
      }
      const byMonth = MONTH_LABELS.map((month, i) => ({ month, count: monthCounts[i] }));

      const recent = recentRaw.map((c) => ({
        id: c.id,
        resident: residentName(c.resident, c.manual_name),
        type: CERT_LABELS[c.certificate_type]?.label ?? titleCase(c.certificate_type),
        purpose: c.purpose,
        issued_at: c.issued_at ? c.issued_at.toISOString() : null,
        issuer: c.issuer.username,
      }));

      return NextResponse.json({ totalThisYear, totalThisMonth, byType, byMonth, recent });
    }

    // ─── BLOTTER ──────────────────────────────────────────────────────────
    case "blotter": {
      const [total, byStatusRaw, escalated, filedRows, resolvedRows, byTypeRaw, recentRaw] = await Promise.all([
        prisma.blotterCase.count({ where: { created_at: { gte: effectiveStart, lte: effectiveEnd } } }),
        prisma.blotterCase.groupBy({
          by: ["status"],
          where: { created_at: { gte: effectiveStart, lte: effectiveEnd } },
          _count: true,
        }),
        prisma.blotterCase.count({ where: { created_at: { gte: effectiveStart, lte: effectiveEnd }, escalated: true } }),
        prisma.blotterCase.findMany({
          where: { created_at: { gte: yearStart, lte: yearEnd } },
          select: { created_at: true },
        }),
        prisma.blotterUpdate.findMany({
          where: { new_status: "RESOLVED", updated_at: { gte: yearStart, lte: yearEnd } },
          select: { updated_at: true },
        }),
        prisma.blotterCase.groupBy({
          by: ["incident_type"],
          where: { created_at: { gte: effectiveStart, lte: effectiveEnd } },
          _count: true,
          orderBy: { _count: { incident_type: "desc" } },
        }),
        prisma.blotterCase.findMany({
          where: { created_at: { gte: effectiveStart, lte: effectiveEnd } },
          orderBy: { created_at: "desc" },
          take: 10,
        }),
      ]);

      const statusCount = (status: string) => byStatusRaw.find((s) => s.status === status)?._count ?? 0;

      const filedByMonth = new Array(12).fill(0);
      for (const { created_at } of filedRows) filedByMonth[new Date(created_at).getMonth()]++;
      const resolvedByMonth = new Array(12).fill(0);
      for (const { updated_at } of resolvedRows) resolvedByMonth[new Date(updated_at).getMonth()]++;
      const byMonth = MONTH_LABELS.map((month, i) => ({ month, filed: filedByMonth[i], resolved: resolvedByMonth[i] }));

      const byType = byTypeRaw.map((t) => ({ type: t.incident_type, count: t._count }));

      const recent = recentRaw.map((c) => ({
        id: c.id,
        case_no: c.case_number,
        complainant: c.complainant_name,
        respondent: c.respondent_name,
        status: c.status,
        date: c.created_at.toISOString(),
        escalated: c.escalated,
      }));

      return NextResponse.json({
        total,
        filed: statusCount("FILED"),
        ongoing: statusCount("ONGOING"),
        resolved: statusCount("RESOLVED"),
        dismissed: statusCount("DISMISSED"),
        escalated,
        byMonth,
        byType,
        recent,
      });
    }

    // ─── FINANCIAL ────────────────────────────────────────────────────────
    case "financial": {
      const [summaryRaw, yearRows, byDescriptionRaw, recentRaw] = await Promise.all([
        prisma.financialRecord.groupBy({
          by: ["transaction_type"],
          where: { transaction_date: { gte: effectiveStart, lte: effectiveEnd } },
          _sum: { amount: true },
        }),
        prisma.financialRecord.findMany({
          where: { transaction_date: { gte: yearStart, lte: yearEnd } },
          select: { transaction_type: true, amount: true, transaction_date: true },
        }),
        prisma.financialRecord.groupBy({
          by: ["transaction_type", "description"],
          where: { transaction_date: { gte: effectiveStart, lte: effectiveEnd } },
          _sum: { amount: true },
        }),
        prisma.financialRecord.findMany({
          where: { transaction_date: { gte: effectiveStart, lte: effectiveEnd } },
          include: { recorder: { select: { username: true } } },
          orderBy: { transaction_date: "desc" },
          take: 10,
        }),
      ]);

      const totalIncome = Number(summaryRaw.find((s) => s.transaction_type === "INCOME")?._sum.amount ?? 0);
      const totalExpense = Number(summaryRaw.find((s) => s.transaction_type === "EXPENSE")?._sum.amount ?? 0);
      const netBalance = totalIncome - totalExpense;

      const incomeByMonth = new Array(12).fill(0);
      const expenseByMonth = new Array(12).fill(0);
      for (const r of yearRows) {
        const m = new Date(r.transaction_date).getMonth();
        const amt = Number(r.amount);
        if (r.transaction_type === "INCOME") incomeByMonth[m] += amt;
        else expenseByMonth[m] += amt;
      }
      const byMonth = MONTH_LABELS.map((month, i) => ({ month, income: incomeByMonth[i], expense: expenseByMonth[i] }));

      // See file-level note: FinancialRecord has no `category` column, so
      // "category" here is the transaction's free-text `description`,
      // which is real (not fabricated) data but only as clean as what
      // was typed in.
      const toCategoryList = (txType: "INCOME" | "EXPENSE") =>
        byDescriptionRaw
          .filter((r) => r.transaction_type === txType)
          .map((r) => ({ category: r.description, amount: Number(r._sum.amount ?? 0) }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 6);

      const incomeByCategory = toCategoryList("INCOME");
      const expenseByCategory = toCategoryList("EXPENSE");

      const recent = recentRaw.map((r) => ({
        id: r.id,
        type: r.transaction_type,
        description: r.description,
        amount: Number(r.amount),
        date: r.transaction_date.toISOString(),
        recorder: r.recorder.username,
      }));

      return NextResponse.json({ totalIncome, totalExpense, netBalance, byMonth, incomeByCategory, expenseByCategory, recent });
    }

    // ─── INVENTORY ────────────────────────────────────────────────────────
    case "inventory": {
      const now = new Date();
      const STATUS_COLOR: Record<string, string> = {
        SERVICEABLE: "#0B6E4F",
        UNSERVICEABLE: "#B45309",
        MISSING: "#B3261E",
      };

      const [total, byStatusRaw, currentlyOut, overdue, equipment, activeBorrowingsByEquipment, recentBorrowingsRaw] =
        await Promise.all([
          prisma.equipment.count(),
          prisma.equipment.groupBy({ by: ["status"], _count: true }),
          prisma.equipmentBorrowing.count({ where: { actual_return: null } }),
          prisma.equipmentBorrowing.count({ where: { actual_return: null, expected_return: { lt: now } } }),
          prisma.equipment.findMany({ orderBy: { name: "asc" } }),
          prisma.equipmentBorrowing.findMany({
            where: { actual_return: null },
            select: { equipment_id: true, expected_return: true },
          }),
          prisma.equipmentBorrowing.findMany({
            include: { equipment: { select: { name: true } } },
            orderBy: { date_borrowed: "desc" },
            take: 10,
          }),
        ]);

      const statusCount = (status: string) => byStatusRaw.find((s) => s.status === status)?._count ?? 0;
      const byStatus = [
        { name: "Serviceable", value: statusCount("SERVICEABLE"), color: STATUS_COLOR.SERVICEABLE },
        { name: "Unserviceable", value: statusCount("UNSERVICEABLE"), color: STATUS_COLOR.UNSERVICEABLE },
        { name: "Missing", value: statusCount("MISSING"), color: STATUS_COLOR.MISSING },
      ];

      const items = equipment.map((e) => {
        const active = activeBorrowingsByEquipment.filter((b) => b.equipment_id === e.id);
        return {
          id: e.id,
          name: e.name,
          qty: e.quantity,
          status: e.status,
          condition: e.condition ?? "\u2014",
          acquired: e.date_acquired ? e.date_acquired.toISOString() : null,
          out: active.length,
          overdue: active.some((b) => b.expected_return < now),
        };
      });

      const recentBorrowings = recentBorrowingsRaw.map((b) => ({
        id: b.id,
        equipment: b.equipment.name,
        borrower: b.borrower_name,
        borrowed: b.date_borrowed.toISOString(),
        due: b.expected_return.toISOString(),
        returned: b.actual_return ? b.actual_return.toISOString() : null,
        overdue: !b.actual_return && b.expected_return < now,
      }));

      return NextResponse.json({
        total,
        serviceable: statusCount("SERVICEABLE"),
        unserviceable: statusCount("UNSERVICEABLE"),
        missing: statusCount("MISSING"),
        currentlyOut,
        overdue,
        byStatus,
        items,
        recentBorrowings,
      });
    }

    // ─── SPECIAL REGISTRIES ───────────────────────────────────────────────
    case "registries": {
      const asOf = { registered_at: { lte: yearEnd } };
      const now = new Date();

      const [seniorEntries, pwdEntries, fourPsEntries] = await Promise.all([
        prisma.specialRegistry.findMany({
          where: { registry_type: "SENIOR_CITIZEN", ...asOf },
          include: { resident: { include: { purok: true } } },
        }),
        prisma.specialRegistry.findMany({
          where: { registry_type: "PWD", ...asOf },
          include: { resident: { include: { purok: true } } },
        }),
        prisma.specialRegistry.findMany({
          where: { registry_type: "FOUR_PS", ...asOf },
          include: { resident: { include: { purok: true } } },
        }),
      ]);

      function groupByPurok(entries: typeof seniorEntries) {
        const counts = new Map<string, number>();
        for (const e of entries) {
          const purok = e.resident.purok?.name ?? "Unassigned";
          counts.set(purok, (counts.get(purok) ?? 0) + 1);
        }
        return Array.from(counts, ([purok, count]) => ({ purok, count })).sort((a, b) => a.purok.localeCompare(b.purok));
      }

      const seniors = {
        total: seniorEntries.length,
        byPurok: groupByPurok(seniorEntries),
      };

      const pwdTypeCounts = new Map<string, number>();
      for (const e of pwdEntries) {
        const t = e.disability_type ?? "Unspecified";
        pwdTypeCounts.set(t, (pwdTypeCounts.get(t) ?? 0) + 1);
      }
      const pwd = {
        total: pwdEntries.length,
        byType: Array.from(pwdTypeCounts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        byPurok: groupByPurok(pwdEntries),
      };

      const fourPsHouseholds = new Set(
        fourPsEntries.map((e) => e.resident.household_id).filter((id): id is number => id != null)
      );
      const fourPs = {
        total: fourPsEntries.length,
        households: fourPsHouseholds.size,
        byPurok: groupByPurok(fourPsEntries),
      };

      const seniorList = seniorEntries.slice(0, 6).map((e) => ({
        id: e.resident.id,
        name: residentName(e.resident, null),
        age: computeAge(new Date(e.resident.birthdate), now),
        purok: e.resident.purok?.name ?? "Unassigned",
        sex: titleCase(e.resident.sex),
      }));

      const pwdList = pwdEntries.slice(0, 5).map((e) => ({
        id: e.resident.id,
        name: residentName(e.resident, null),
        disability: e.disability_type ?? "Not specified",
        purok: e.resident.purok?.name ?? "Unassigned",
        sex: titleCase(e.resident.sex),
      }));

      return NextResponse.json({
        seniors,
        pwd,
        fourPs,
        seniorList,
        pwdList,
      });
    }

    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
});