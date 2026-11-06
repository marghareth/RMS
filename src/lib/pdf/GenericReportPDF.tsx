// FILE: src/lib/pdf/GenericReportPDF.tsx
// Generic, data-driven PDF document for the five downloadable barangay
// reports (certificates, financial, blotter, registries, inventory). Reuses
// the same visual language as PopulationReportPDF (see reportStyles.ts) so
// every generated report in the app looks consistent, without needing a
// bespoke React component per report type.
import { Document, Page, Text, View, Font } from "@react-pdf/renderer";

// Wrap whole words only ("Clearance", not "Clear-ance").
Font.registerHyphenationCallback((word) => [word]);
import { reportStyles as s } from "./reportStyles";

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
}

export interface TableSection {
  title: string;
  columns: { header: string; align?: "left" | "right" }[];
  rows: string[][];
  /** Small print under the table, e.g. "Showing the latest 100 of 412." */
  note?: string;
}

interface GenericReportPDFProps {
  reportTitle: string;
  periodLabel: string;
  stats: StatItem[];
  tables: TableSection[];
  barangayName?: string;
  city?: string;
  province?: string;
}

export default function GenericReportPDF({
  reportTitle,
  periodLabel,
  stats,
  tables,
  barangayName = "",
  city = "",
  province = "",
}: GenericReportPDFProps) {
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const location = [city, province].filter(Boolean).join(", ");

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.barangayName}>{barangayName || "Barangay"}</Text>
            {location ? <Text style={s.headerSub}>{location}</Text> : null}
          </View>
          <View>
            <Text style={s.reportTitle}>{reportTitle}</Text>
            <Text style={s.reportMeta}>{periodLabel}</Text>
            <Text style={s.reportMeta}>Generated: {generatedOn}</Text>
          </View>
        </View>

        {/* Summary stats */}
        {stats.length > 0 && (
          <View style={s.statRow}>
            {stats.map((st) => (
              <View key={st.label} style={s.statBox}>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
                {st.hint ? <Text style={{ fontSize: 7, color: "#9CA3AF", marginTop: 2 }}>{st.hint}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Tables */}
        {tables.map((table) => (
          // Short tables stay together on one page; long ones are allowed to
          // continue onto the next page (wrap={false} on a table taller than
          // a page used to push it off the bottom).
          <View key={table.title} style={s.section} wrap={table.rows.length > 15}>
            <Text style={s.sectionTitle}>{table.title}</Text>
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                {table.columns.map((col) => (
                  <Text
                    key={col.header}
                    style={col.align === "right" ? s.tableHeaderCellRight : s.tableHeaderCell}
                  >
                    {col.header}
                  </Text>
                ))}
              </View>
              {table.rows.length === 0 ? (
                <View style={{ ...s.tableRow, ...s.tableRowLast }}>
                  <Text style={s.tableCell}>No records for this period.</Text>
                </View>
              ) : (
                table.rows.map((row, i) => (
                  <View
                    key={i}
                    style={i === table.rows.length - 1 ? { ...s.tableRow, ...s.tableRowLast } : s.tableRow}
                  >
                    {row.map((cell, j) => (
                      <Text
                        key={j}
                        style={table.columns[j]?.align === "right" ? s.tableCellRight : s.tableCell}
                      >
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))
              )}
            </View>
            {table.note ? <Text style={{ fontSize: 7, color: "#9CA3AF", marginTop: 3 }}>{table.note}</Text> : null}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Barangay Records Management System</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}