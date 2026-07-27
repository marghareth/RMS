// FILE: src/app/api/pdf/report/[type]/route.ts
// Server-rendered PDF export for the five aggregate reports under
// /reports/*. Pulls the same underlying data as GET /api/reports?type=...
// but formats it into a printable document via GenericReportPDF, instead
// of relying on the client's window.print() of the on-screen charts.
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import GenericReportPDF, { StatItem, TableSection } from "@/lib/pdf/GenericReportPDF";
import { withErrorHandling } from "@/lib/api-handler";

// @react-pdf/renderer renders with a real Node canvas/font pipeline, which
// isn't available on the Edge runtime — this route must run on Node.
export const runtime = "nodejs";

const REPORT_TYPES = ["certificates", "financial", "blotter", "inventory", "registries"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(n: number): string {
  return `\u20B1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function residentName(r: { fname: string; lname: string; mname: string | null; name_extension: string | null } | null): string {
  if (!r) return "\u2014";
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mi}`;
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("reports:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type: rawType } = await context!.params;
  if (!REPORT_TYPES.includes(rawType as ReportType)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
  const type = rawType as ReportType;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const date_from = searchParams.get("date_from") ?? (year ? `${year}-${month ?? "01"}-01` : null);
  const date_to =
    searchParams.get("date_to") ??
    (year && !month ? `${Number(year) + 1}-01-01` : year && month ? `${year}-${String(Number(month) + 1).padStart(2, "0")}-01` : null);

  const dateFilter = {
    ...(date_from && { gte: new Date(date_from) }),
    ...(date_to && { lt: new Date(date_to) }),
  };
  const hasDateFilter = Object.keys(dateFilter).length > 0;
  const periodLabel = year ? `Period: ${year}${month ? `-${month}` : ""}` : "Period: All time";

  let reportTitle = "";
  let stats: StatItem[] = [];
  let tables: TableSection[] = [];

  switch (type) {
    case "certificates": {
      reportTitle = "Certificates Report";
      const [total, byType, recent] = await Promise.all([
        prisma.certificate.count({ where: hasDateFilter ? { issued_at: dateFilter } : {} }),
        prisma.certificate.groupBy({
          by: ["certificate_type"],
          where: hasDateFilter ? { issued_at: dateFilter } : {},
          _count: true,
        }),
        prisma.certificate.findMany({
          where: hasDateFilter ? { issued_at: dateFilter } : {},
          include: { resident: true, issuer: { select: { username: true } } },
          orderBy: { issued_at: "desc" },
          take: 50,
        }),
      ]);

      stats = [
        { label: "Total Issued", value: String(total) },
        ...byType.slice(0, 3).map((t) => ({ label: t.certificate_type.replace(/_/g, " "), value: String(t._count) })),
      ];
      tables = [
        {
          title: "By Type",
          columns: [{ header: "Certificate Type" }, { header: "Count", align: "right" }],
          rows: byType.map((t) => [t.certificate_type.replace(/_/g, " "), String(t._count)]),
        },
        {
          title: "Recent Issuances",
          columns: [{ header: "Resident" }, { header: "Type" }, { header: "Purpose" }, { header: "Issued" }, { header: "Issued By" }],
          rows: recent.map((c) => [
            c.resident ? residentName(c.resident) : (c.manual_name ?? "\u2014"),
            c.certificate_type.replace(/_/g, " "),
            c.purpose,
            fmtDate(c.issued_at),
            c.issuer.username,
          ]),
        },
      ];
      break;
    }

    case "financial": {
      reportTitle = "Financial Report";
      const [summary, recent] = await Promise.all([
        prisma.financialRecord.groupBy({
          by: ["transaction_type"],
          where: hasDateFilter ? { transaction_date: dateFilter } : {},
          _sum: { amount: true },
          _count: true,
        }),
        prisma.financialRecord.findMany({
          where: hasDateFilter ? { transaction_date: dateFilter } : {},
          include: { recorder: { select: { username: true } } },
          orderBy: { transaction_date: "desc" },
          take: 50,
        }),
      ]);

      const income = summary.find((s) => s.transaction_type === "INCOME")?._sum.amount ?? 0;
      const expense = summary.find((s) => s.transaction_type === "EXPENSE")?._sum.amount ?? 0;
      const net = Number(income) - Number(expense);

      stats = [
        { label: "Total Income", value: money(Number(income)) },
        { label: "Total Expense", value: money(Number(expense)) },
        { label: "Net Balance", value: money(net) },
      ];
      tables = [
        {
          title: "Transactions",
          columns: [
            { header: "Date" }, { header: "Type" }, { header: "Description" },
            { header: "Amount", align: "right" }, { header: "Recorded By" },
          ],
          rows: recent.map((f) => [
            fmtDate(f.transaction_date),
            f.transaction_type,
            f.description,
            money(Number(f.amount)),
            f.recorder.username,
          ]),
        },
      ];
      break;
    }

    case "blotter": {
      reportTitle = "Blotter Report";
      const [total, byStatus, recent] = await Promise.all([
        prisma.blotterCase.count({ where: hasDateFilter ? { created_at: dateFilter } : {} }),
        prisma.blotterCase.groupBy({
          by: ["status"],
          where: hasDateFilter ? { created_at: dateFilter } : {},
          _count: true,
        }),
        prisma.blotterCase.findMany({
          where: hasDateFilter ? { created_at: dateFilter } : {},
          orderBy: { created_at: "desc" },
          take: 50,
        }),
      ]);

      stats = [
        { label: "Total Cases", value: String(total) },
        ...byStatus.map((s) => ({ label: s.status, value: String(s._count) })),
      ];
      tables = [
        {
          title: "Cases",
          columns: [
            { header: "Case No." }, { header: "Complainant" }, { header: "Respondent" },
            { header: "Status" }, { header: "Filed" },
          ],
          rows: recent.map((c) => [
            c.case_number,
            c.complainant_name,
            c.respondent_name,
            c.status + (c.escalated ? " (Escalated)" : ""),
            fmtDate(c.incident_date),
          ]),
        },
      ];
      break;
    }

    case "inventory": {
      reportTitle = "Equipment Inventory Report";
      const [total, byStatus, items] = await Promise.all([
        prisma.equipment.count(),
        prisma.equipment.groupBy({ by: ["status"], _count: true, _sum: { quantity: true } }),
        prisma.equipment.findMany({ orderBy: { name: "asc" }, take: 100 }),
      ]);

      stats = [
        { label: "Total Items", value: String(total) },
        ...byStatus.map((s) => ({ label: s.status, value: String(s._sum.quantity ?? 0) })),
      ];
      tables = [
        {
          title: "Equipment",
          columns: [
            { header: "Name" }, { header: "Qty", align: "right" }, { header: "Status" },
            { header: "Condition" }, { header: "Acquired" },
          ],
          rows: items.map((e) => [
            e.name,
            String(e.quantity),
            e.status,
            e.condition ?? "\u2014",
            e.date_acquired ? fmtDate(e.date_acquired) : "\u2014",
          ]),
        },
      ];
      break;
    }

    case "registries": {
      reportTitle = "Special Registries Report";
      const [byType, entries] = await Promise.all([
        prisma.specialRegistry.groupBy({ by: ["registry_type"], _count: true }),
        prisma.specialRegistry.findMany({
          include: { resident: true },
          orderBy: { registered_at: "desc" },
          take: 100,
        }),
      ]);

      stats = byType.map((t) => ({ label: t.registry_type.replace(/_/g, " "), value: String(t._count) }));
      tables = [
        {
          title: "Registered Residents",
          columns: [{ header: "Resident" }, { header: "Registry" }, { header: "Detail" }, { header: "Registered" }],
          rows: entries.map((r) => [
            residentName(r.resident),
            r.registry_type.replace(/_/g, " "),
            r.disability_type ?? (r.is_4ps_beneficiary ? "4Ps Beneficiary" : "\u2014"),
            fmtDate(r.registered_at),
          ]),
        },
      ];
      break;
    }
  }

  const buffer = await renderToBuffer(
    // @react-pdf/renderer types renderToBuffer as expecting ReactElement<DocumentProps>.
    // Since GenericReportPDFProps shares no keys with that (all-optional) interface,
    // TS's weak-type check flags this even though the component genuinely renders a
    // <Document> — a known typing false-positive with this library, not a real error.
    createElement(GenericReportPDF, { reportTitle, periodLabel, stats, tables }) as Parameters<typeof renderToBuffer>[0]
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${type}-report.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
});