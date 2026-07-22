// FILE: src/lib/pdf/CertificatePDF.tsx
// Server-rendered PDF for a single issued certificate, built with
// @react-pdf/renderer. Used by GET /api/pdf/certificate/[id] (see
// generatePdf.ts / renderToBuffer for the Node-side render helper) and
// mirrors the on-screen layout in
// src/app/(dashboard)/certificates/[id]/preview/page.tsx so the downloaded
// file matches what was previewed.
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { COLORS } from "./reportStyles";

const s = StyleSheet.create({
  page: {
    padding: 54,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: COLORS.ink,
  },
  letterhead: {
    alignItems: "center",
    textAlign: "center",
    borderBottom: `2 solid ${COLORS.ink}`,
    paddingBottom: 18,
    marginBottom: 28,
  },
  letterheadEyebrow: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.gray,
  },
  letterheadLine: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 1,
  },
  letterheadOffice: {
    fontSize: 16,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 26,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.7,
    textAlign: "justify",
    marginBottom: 14,
  },
  indented: {
    marginLeft: 24,
  },
  purposeBox: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  purposeText: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    textAlign: "center",
  },
  signatoryBlock: {
    marginTop: 64,
    alignItems: "flex-end",
  },
  signatoryInner: {
    alignItems: "center",
    width: 220,
  },
  signatoryName: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  signatoryLine: {
    borderTop: `1 solid ${COLORS.ink}`,
    marginTop: 4,
    paddingTop: 3,
    width: "100%",
    alignItems: "center",
  },
  signatoryPosition: {
    fontSize: 9,
    color: COLORS.gray,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 6,
    fontSize: 8,
    color: COLORS.grayLight,
  },
});

interface CertificatePDFProps {
  title: string;
  body: string;
  closing: string;
  purpose: string;
  certificateNo: string;
  applicantName: string;
  flaggedManual: boolean;
  captainName: string;
  captainPosition: string;
  barangayName: string;
  city: string;
  province: string;
  region: string;
}

export default function CertificatePDF({
  title,
  body,
  closing,
  purpose,
  certificateNo,
  applicantName,
  flaggedManual,
  captainName,
  captainPosition,
  barangayName,
  city,
  province,
  region,
}: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Letterhead */}
        <View style={s.letterhead}>
          <Text style={s.letterheadEyebrow}>Republic of the Philippines</Text>
          <Text style={s.letterheadLine}>{province}, {region}</Text>
          <Text style={s.letterheadLine}>City of {city}</Text>
          <Text style={s.letterheadOffice}>Office of the {barangayName}</Text>
        </View>

        {/* Title */}
        <Text style={s.title}>{title}</Text>

        {/* Body */}
        <Text style={s.paragraph}>TO WHOM IT MAY CONCERN:</Text>
        <Text style={[s.paragraph, s.indented]}>{body}</Text>
        <Text style={[s.paragraph, s.indented]}>
          This certification is being issued upon the request of the above-named person for the purpose of:
        </Text>
        <View style={s.purposeBox}>
          <Text style={s.purposeText}>{purpose}</Text>
        </View>
        <Text style={[s.paragraph, s.indented]}>{closing}</Text>

        {/* Signatory */}
        <View style={s.signatoryBlock}>
          <View style={s.signatoryInner}>
            <Text style={s.signatoryName}>{captainName}</Text>
            <View style={s.signatoryLine}>
              <Text style={s.signatoryPosition}>{captainPosition}</Text>
            </View>
          </View>
        </View>

        {/* Footer meta */}
        <View style={s.footer} fixed>
          <Text>Certificate No. {certificateNo}</Text>
          <Text>
            Applicant: {applicantName}
            {flaggedManual ? "  •  Walk-in / Not Yet in RBI" : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}