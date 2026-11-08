// FILE: src/lib/pdf/ListExportPDF.tsx
//
// A printable list (Nov 2026): the PDF choice of the Residents and
// Households exports. Only the important columns are included; the Excel
// export keeps every field.
//
// Layout: A4 portrait. A running header on every page (barangay, title,
// one summary line, and the column headings), numbered rows with light
// striping, and a footer with "Page x of y" and a reminder that the list
// holds personal information. Same colours as the other report PDFs
// (reportStyles.ts). Rows never split across pages.
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { COLORS } from "./reportStyles";

// Wrap whole words only ("Dela Cruz", not "Dela Cr-uz").
Font.registerHyphenationCallback((word) => [word]);

export interface ListColumn {
  header: string;
  /** Relative width (flex grow). */
  width: number;
  align?: "left" | "right";
}

export interface ListExportPDFProps {
  barangayName: string;
  location?: string;
  title: string;
  /** Short facts joined with "·", e.g. ["302 residents", "150 male"]. */
  summary: string[];
  /** Which records and who exported them, shown under the summary. */
  note: string;
  columns: ListColumn[];
  rows: string[][];
  /** Shown instead of the table when there are no rows. */
  emptyText?: string;
}

// Height of the running header (title block + column headings), so rows start right under it.
const HEADER_HEIGHT = 91;

const s = StyleSheet.create({
  page: {
    paddingTop: 36 + HEADER_HEIGHT,
    paddingBottom: 56,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.ink,
  },
  header: { position: "absolute", top: 36, left: 36, right: 36 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  barangay: { fontSize: 13, fontWeight: 700, color: COLORS.ink },
  location: { fontSize: 8, color: COLORS.gray, marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, color: COLORS.blueDark, textAlign: "right" },
  rule: { borderBottom: `1.5 solid ${COLORS.ink}`, marginTop: 8, marginBottom: 7 },
  summary: { fontSize: 9, color: COLORS.ink },
  note: { fontSize: 7.5, color: COLORS.gray, marginTop: 2, maxLines: 1, textOverflow: "ellipsis" },
  headRow: {
    flexDirection: "row",
    marginTop: 10,
    backgroundColor: COLORS.blue,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  headCell: { fontSize: 8, fontWeight: 700, color: "#FFFFFF", paddingRight: 6 },
  row: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderBottom: `0.5 solid ${COLORS.border}`,
  },
  striped: { backgroundColor: "#F5F7FB" },
  cell: { fontSize: 8.5, paddingRight: 6 },
  num: { width: 24, fontSize: 8, color: COLORS.grayLight, paddingRight: 6 },
  numHead: { width: 24, fontSize: 8, fontWeight: 700, color: "#FFFFFF", paddingRight: 6 },
  empty: { fontSize: 9, color: COLORS.gray, paddingVertical: 14, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5 solid ${COLORS.border}`,
    paddingTop: 6,
    fontSize: 7,
    color: COLORS.grayLight,
  },
});

export default function ListExportPDF({
  barangayName,
  location,
  title,
  summary,
  note,
  columns,
  rows,
  emptyText = "Nothing to list.",
}: ListExportPDFProps) {
  const cellStyle = (c: ListColumn) => ({ flexGrow: c.width, flexBasis: 0, textAlign: c.align ?? "left" } as const);

  return (
    <Document title={`${barangayName} — ${title}`} author="Barangay Records Management System">
      <Page size="A4" style={s.page} wrap>
        {/* Running header, repeated on every page */}
        <View style={s.header} fixed>
          <View style={s.topRow}>
            <View>
              <Text style={s.barangay}>{barangayName}</Text>
              {location ? <Text style={s.location}>{location}</Text> : null}
            </View>
            <Text style={s.title}>{title}</Text>
          </View>
          <View style={s.rule} />
          <Text style={s.summary}>{summary.filter(Boolean).join("  ·  ")}</Text>
          <Text style={s.note}>{note}</Text>
          <View style={s.headRow}>
            <Text style={s.numHead}>#</Text>
            {columns.map((c) => (
              <Text key={c.header} style={[s.headCell, cellStyle(c)]}>
                {c.header}
              </Text>
            ))}
          </View>
        </View>

        {/* Rows */}
        {rows.length === 0 ? (
          <Text style={s.empty}>{emptyText}</Text>
        ) : (
          rows.map((row, i) => (
            <View key={i} style={i % 2 === 1 ? [s.row, s.striped] : s.row} wrap={false}>
              <Text style={s.num}>{i + 1}</Text>
              {columns.map((c, j) => (
                <Text key={c.header} style={[s.cell, cellStyle(c)]}>
                  {row[j] ?? ""}
                </Text>
              ))}
            </View>
          ))
        )}

        <View style={s.footer} fixed>
          <Text>Contains personal information. Keep it secure.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}