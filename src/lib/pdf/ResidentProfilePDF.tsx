// FILE: src/lib/pdf/ResidentProfilePDF.tsx
//
// A resident's printed profile (Nov 2026). The person printing it chooses
// which sections to include (personal information, household, certificates,
// health, government assistance, blotter involvement); see
// GET /api/pdf/resident/[id] and the "Print profile" dialog on the
// resident page. Sections that weren't chosen, or that the user's role
// can't see, are simply left out.
import { Fragment } from "react";
// react-pdf's Image is imported as PdfImage: it has no alt prop (PDFs have no
// alt text), and the name "Image" makes the jsx-a11y/alt-text rule mistake it
// for next/image.
import { Document, Page, Text, View, StyleSheet, Image as PdfImage, Font } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#1F3A93";
const INK = "#111827";
const GRAY = "#4B5563";
const LIGHT = "#9CA3AF";
const LINE = "#E5E7EB";

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 50, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: INK },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  hText: { flex: 1 },
  hSmall: { fontFamily: "Times-Roman", fontSize: 10, color: GRAY },
  hBrgy: { fontFamily: "Times-Bold", fontSize: 15, color: NAVY, marginTop: 1 },
  rule: { height: 1.5, backgroundColor: NAVY, marginTop: 8 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14, marginBottom: 4 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 14, letterSpacing: 1 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 6 },
  sub: { fontSize: 9, color: GRAY, marginTop: 2 },
  refBox: { alignItems: "flex-end" },
  refLabel: { fontSize: 7, color: GRAY, letterSpacing: 0.5 },
  refValue: { fontFamily: "Courier-Bold", fontSize: 12 },

  section: { marginTop: 14 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, color: NAVY, letterSpacing: 1, borderBottom: `0.75 solid ${NAVY}`, paddingBottom: 3, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", flexDirection: "row", paddingVertical: 2.5, paddingRight: 8 },
  fieldWide: { width: "100%", flexDirection: "row", paddingVertical: 2.5 },
  fLabel: { width: 96, fontSize: 8.5, color: GRAY },
  fValue: { flex: 1, fontSize: 9.5 },

  headRow: { borderTop: `0.5 solid ${LINE}` },
  tr: { flexDirection: "row", borderBottom: `0.5 solid ${LINE}`, paddingVertical: 3.5 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: GRAY, textTransform: "uppercase" },
  td: { fontSize: 9, paddingRight: 6 },
  empty: { fontFamily: "Helvetica-Oblique", fontSize: 9, color: LIGHT, paddingVertical: 3 },
  subTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginTop: 8, marginBottom: 3 },

  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  sign: { width: 190 },
  signName: { fontFamily: "Helvetica-Bold", fontSize: 9.5, textAlign: "center", textTransform: "uppercase" },
  signLine: { borderTop: `0.75 solid ${INK}`, paddingTop: 2, marginTop: 2 },
  signCaption: { fontSize: 8, color: GRAY, textAlign: "center" },

  footRule: { position: "absolute", left: 40, right: 40, bottom: 40, borderTop: `0.5 solid ${LINE}` },
  footNote: { position: "absolute", left: 40, bottom: 20, width: 420, fontSize: 7, color: GRAY, lineHeight: 1.35 },
  footPage: { position: "absolute", right: 40, bottom: 20, fontSize: 7, color: GRAY },
});

export interface ProfileField {
  label: string;
  value: string;
  wide?: boolean;
}

export interface ProfileTable {
  title?: string;
  columns: { header: string; width: string }[];
  rows: string[][];
  empty: string;
}

export interface ProfileSection {
  title: string;
  fields?: ProfileField[];
  tables?: ProfileTable[];
}

export interface ResidentProfileProps {
  barangayName: string;
  provinceLine: string;
  cityLine: string;
  logo?: string;
  fullName: string;
  subtitle: string;
  rbiNo: string;
  sections: ProfileSection[];
  printedBy: string;
  printedAt: string;
  captainName: string;
  captainPosition: string;
}

/**
 * A table. The section title, table title, column headers and first row
 * form one block that can't be split, so a heading is never left alone at
 * the foot of a page; later rows flow onto the next page one by one.
 * `lead` is the section title when the table opens its section.
 */
function Table({ t, lead }: { t: ProfileTable; lead?: React.ReactNode }) {
  const row = (r: string[], i: number) => (
    <View key={i} style={s.tr} wrap={false}>
      {r.map((cell, j) => (
        <Text key={j} style={[s.td, { width: t.columns[j]?.width }]}>
          {cell}
        </Text>
      ))}
    </View>
  );
  // A fragment, not a wrapping View: react-pdf mis-lays unbreakable blocks
  // inside a box that spans two pages, so every row is a direct page child.
  return (
    <>
      <View wrap={false}>
        {lead}
        {t.title ? <Text style={s.subTitle}>{t.title}</Text> : null}
        {t.rows.length === 0 ? <Text style={s.empty}>{t.empty}</Text> : null}
        {t.rows.length > 0 ? (
          <View style={[s.tr, s.headRow]}>
            {t.columns.map((c) => (
              <Text key={c.header} style={[s.td, s.th, { width: c.width }]}>
                {c.header}
              </Text>
            ))}
          </View>
        ) : null}
        {t.rows.length > 0 ? row(t.rows[0], 0) : null}
      </View>
      {t.rows.slice(1).map((r, i) => row(r, i + 1))}
    </>
  );
}

export default function ResidentProfilePDF(p: ResidentProfileProps) {
  return (
    <Document title={`Resident Profile – ${p.fullName}`} author={p.barangayName}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {p.logo ? <PdfImage src={p.logo} style={s.logo} /> : null}
          <View style={s.hText}>
            <Text style={s.hSmall}>Republic of the Philippines</Text>
            {p.provinceLine ? <Text style={s.hSmall}>{p.provinceLine}</Text> : null}
            {p.cityLine ? <Text style={s.hSmall}>{p.cityLine}</Text> : null}
            <Text style={s.hBrgy}>{p.barangayName.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.titleRow}>
          <View>
            <Text style={s.title}>RESIDENT PROFILE</Text>
            <Text style={s.name}>{p.fullName}</Text>
            <Text style={s.sub}>{p.subtitle}</Text>
          </View>
          <View style={s.refBox}>
            <Text style={s.refLabel}>RBI NO.</Text>
            <Text style={s.refValue}>{p.rbiNo}</Text>
          </View>
        </View>

        {p.sections.map((sec) => (
          <Fragment key={sec.title}>
            {sec.fields?.length ? (
              <Text style={[s.sectionTitle, s.section]} minPresenceAhead={60}>
                {sec.title.toUpperCase()}
              </Text>
            ) : null}
            {sec.fields?.length ? (
              <View style={s.grid}>
                {sec.fields.map((f) => (
                  <View key={f.label} style={f.wide ? s.fieldWide : s.field} wrap={false}>
                    <Text style={s.fLabel}>{f.label}</Text>
                    <Text style={s.fValue}>{f.value || "—"}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {sec.tables?.map((t, i) => (
              <Table
                key={i}
                t={t}
                lead={
                  i === 0 && !sec.fields?.length ? <Text style={[s.sectionTitle, s.section]}>{sec.title.toUpperCase()}</Text> : undefined
                }
              />
            ))}
          </Fragment>
        ))}

        <View style={s.signs} wrap={false}>
          <View style={s.sign}>
            <Text style={s.signName}>{p.printedBy}</Text>
            <View style={s.signLine}>
              <Text style={s.signCaption}>Prepared by</Text>
            </View>
          </View>
          <View style={s.sign}>
            <Text style={s.signName}>{p.captainName || " "}</Text>
            <View style={s.signLine}>
              <Text style={s.signCaption}>{p.captainPosition || "Punong Barangay"}</Text>
            </View>
          </View>
        </View>

        <View style={s.footRule} fixed />
        <Text style={s.footNote} fixed>
          {`Printed ${p.printedAt} by ${p.printedBy}. Contains personal information protected by the Data Privacy Act of 2012 (RA 10173). For official use only; do not share or leave unattended.`}
        </Text>
        <Text style={s.footPage} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}