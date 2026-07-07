// Real, downloadable PDF document for the Population Report, built with
// @react-pdf/renderer. Rendered client-side via generatePdf.ts's
// downloadPdf() helper — no server round-trip needed since the report data
// already lives client-side (mock for now, same shape the real API returns).
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { reportStyles as s } from "./reportStyles";

export interface PopulationReportData {
  total: number;
  byPurok: { purok: string; count: number; households: number }[];
  bySex: { sex: string; count: number }[];
  byAgeGroup: { group: string; count: number }[];
  byCivilStatus: { status: string; count: number }[];
  byEmployment: { status: string; count: number }[];
}

interface PopulationReportPDFProps {
  data: PopulationReportData;
  year: string;
  barangayName?: string;
  city?: string;
  province?: string;
}

function pct(n: number, total: number) {
  return `${((n / total) * 100).toFixed(1)}%`;
}

export default function PopulationReportPDF({
  data,
  year,
  barangayName = "Barangay Quisol",
  city = "Danao City",
  province = "Cebu",
}: PopulationReportPDFProps) {
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.barangayName}>{barangayName}</Text>
            <Text style={s.headerSub}>{city}, {province}</Text>
          </View>
          <View>
            <Text style={s.reportTitle}>Population Report</Text>
            <Text style={s.reportMeta}>Year: {year}</Text>
            <Text style={s.reportMeta}>Generated: {generatedOn}</Text>
          </View>
        </View>

        {/* Summary stats */}
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{data.total.toLocaleString()}</Text>
            <Text style={s.statLabel}>Total Residents</Text>
          </View>
          {data.bySex.map((sx) => (
            <View key={sx.sex} style={s.statBox}>
              <Text style={s.statValue}>{sx.count.toLocaleString()}</Text>
              <Text style={s.statLabel}>{sx.sex}</Text>
            </View>
          ))}
          <View style={s.statBox}>
            <Text style={s.statValue}>{data.byPurok.length}</Text>
            <Text style={s.statLabel}>Puroks Covered</Text>
          </View>
        </View>

        {/* Population by Purok */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Population by Purok</Text>
          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={s.tableHeaderCell}>Purok</Text>
              <Text style={s.tableHeaderCellRight}>Residents</Text>
              <Text style={s.tableHeaderCellRight}>Households</Text>
              <Text style={s.tableHeaderCellRight}>Avg / HH</Text>
              <Text style={s.tableHeaderCellRight}>% of Total</Text>
            </View>
            {data.byPurok.map((p, i) => (
              <View key={p.purok} style={i === data.byPurok.length - 1 ? { ...s.tableRow, ...s.tableRowLast } : s.tableRow}>
                <Text style={s.tableCell}>{p.purok}</Text>
                <Text style={s.tableCellRight}>{p.count}</Text>
                <Text style={s.tableCellRight}>{p.households}</Text>
                <Text style={s.tableCellRight}>{(p.count / p.households).toFixed(1)}</Text>
                <Text style={s.tableCellRight}>{pct(p.count, data.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Age Group */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Population by Age Group</Text>
          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={s.tableHeaderCell}>Age Group</Text>
              <Text style={s.tableHeaderCellRight}>Count</Text>
              <Text style={s.tableHeaderCellRight}>% of Total</Text>
            </View>
            {data.byAgeGroup.map((g, i) => (
              <View key={g.group} style={i === data.byAgeGroup.length - 1 ? { ...s.tableRow, ...s.tableRowLast } : s.tableRow}>
                <Text style={s.tableCell}>{g.group}</Text>
                <Text style={s.tableCellRight}>{g.count}</Text>
                <Text style={s.tableCellRight}>{pct(g.count, data.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Civil Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Civil Status Breakdown</Text>
          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={s.tableHeaderCell}>Status</Text>
              <Text style={s.tableHeaderCellRight}>Count</Text>
              <Text style={s.tableHeaderCellRight}>% of Total</Text>
            </View>
            {data.byCivilStatus.map((c, i) => (
              <View key={c.status} style={i === data.byCivilStatus.length - 1 ? { ...s.tableRow, ...s.tableRowLast } : s.tableRow}>
                <Text style={s.tableCell}>{c.status}</Text>
                <Text style={s.tableCellRight}>{c.count}</Text>
                <Text style={s.tableCellRight}>{pct(c.count, data.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Employment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Employment Status</Text>
          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={s.tableHeaderCell}>Status</Text>
              <Text style={s.tableHeaderCellRight}>Count</Text>
              <Text style={s.tableHeaderCellRight}>% of Total</Text>
            </View>
            {data.byEmployment.map((e, i) => (
              <View key={e.status} style={i === data.byEmployment.length - 1 ? { ...s.tableRow, ...s.tableRowLast } : s.tableRow}>
                <Text style={s.tableCell}>{e.status}</Text>
                <Text style={s.tableCellRight}>{e.count}</Text>
                <Text style={s.tableCellRight}>{pct(e.count, data.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Barangay Records Management System</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}