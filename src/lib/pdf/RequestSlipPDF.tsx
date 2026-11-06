// FILE: src/lib/pdf/RequestSlipPDF.tsx
//
// The slip handed to someone after they file a request (Nov 2026): what
// they asked for, the reference number, and when it was filed, with a
// requester's copy on top and an office copy below a cut line. Half-sheet
// friendly: both copies fit on one A4 page.
//
// Built by GET /api/pdf/slip/[kind]/[id] for certificate requests, Barangay
// IDs, blotter cases and equipment borrowings.
// react-pdf's Image is imported as PdfImage: it has no alt prop (PDFs have no
// alt text), and the name "Image" makes the jsx-a11y/alt-text rule mistake it
// for next/image.
import { Document, Page, Text, View, StyleSheet, Image as PdfImage, Font } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#1A3A8F";
const INK = "#111827";
const GRAY = "#4B5563";
const LIGHT = "#9CA3AF";

const s = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 30, fontFamily: "Helvetica", fontSize: 10, color: INK },
  copy: { height: 370 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, borderBottom: `1.5 solid ${NAVY}`, paddingBottom: 8 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  hText: { flex: 1 },
  hSmall: { fontSize: 8, color: GRAY },
  hBrgy: { fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY, marginTop: 1 },
  copyTag: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: LIGHT, letterSpacing: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, marginBottom: 10 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  subtitle: { fontSize: 9, color: GRAY, marginTop: 2 },
  refBox: { border: `1 solid ${INK}`, paddingVertical: 5, paddingHorizontal: 10, alignItems: "center" },
  refLabel: { fontSize: 7, color: GRAY, letterSpacing: 0.5 },
  refValue: { fontFamily: "Courier-Bold", fontSize: 15, marginTop: 1 },
  row: { flexDirection: "row", borderBottom: `0.5 solid #E5E7EB`, paddingVertical: 4.5 },
  label: { width: 120, fontSize: 9, color: GRAY },
  value: { flex: 1, fontSize: 10 },
  note: { marginTop: 10, fontSize: 8.5, color: GRAY, lineHeight: 1.4 },
  signs: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  sign: { width: 180, borderTop: `0.75 solid ${INK}`, paddingTop: 2, alignItems: "center" },
  signText: { fontSize: 7.5, color: GRAY },
  cut: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  cutLine: { flex: 1, borderTop: `1 dashed ${LIGHT}` },
  cutText: { fontSize: 7, color: LIGHT, marginHorizontal: 6 },
});

export interface RequestSlipProps {
  barangayName: string;
  cityLine: string;
  logo?: string;
  title: string;
  subtitle?: string;
  reference: { label: string; value: string };
  rows: { label: string; value: string }[];
  note?: string;
  /** Who filed it in the system (staff username). */
  recordedBy?: string;
}

function Copy({ p, tag }: { p: RequestSlipProps; tag: string }) {
  return (
    <View style={s.copy}>
      <View style={s.header}>
        {p.logo ? <PdfImage src={p.logo} style={s.logo} /> : null}
        <View style={s.hText}>
          <Text style={s.hSmall}>Republic of the Philippines · {p.cityLine}</Text>
          <Text style={s.hBrgy}>{p.barangayName.toUpperCase()}</Text>
        </View>
        <Text style={s.copyTag}>{tag}</Text>
      </View>

      <View style={s.titleRow}>
        <View>
          <Text style={s.title}>{p.title}</Text>
          {p.subtitle ? <Text style={s.subtitle}>{p.subtitle}</Text> : null}
        </View>
        <View style={s.refBox}>
          <Text style={s.refLabel}>{p.reference.label.toUpperCase()}</Text>
          <Text style={s.refValue}>{p.reference.value}</Text>
        </View>
      </View>

      {p.rows
        .filter((r) => r.value)
        .map((r) => (
          <View key={r.label} style={s.row}>
            <Text style={s.label}>{r.label}</Text>
            <Text style={s.value}>{r.value}</Text>
          </View>
        ))}

      {p.note ? <Text style={s.note}>{p.note}</Text> : null}

      <View style={s.signs}>
        <View style={s.sign}>
          <Text style={s.signText}>Requester&apos;s signature</Text>
        </View>
        <View style={s.sign}>
          <Text style={s.signText}>Received by{p.recordedBy ? ` (${p.recordedBy})` : ""}</Text>
        </View>
      </View>
    </View>
  );
}

export default function RequestSlipPDF(p: RequestSlipProps) {
  return (
    <Document title={`${p.title} – ${p.reference.value}`}>
      <Page size="A4" style={s.page}>
        <Copy p={p} tag="REQUESTER'S COPY" />
        <View style={s.cut}>
          <View style={s.cutLine} />
          <Text style={s.cutText}>cut here</Text>
          <View style={s.cutLine} />
        </View>
        <Copy p={p} tag="OFFICE COPY" />
      </Page>
    </Document>
  );
}