// FILE: src/lib/pdf/BarangayIdPDF.tsx
// Server-rendered, printable Barangay ID card, built with @react-pdf/renderer.
// Mirrors the on-screen card in (dashboard)/barangay_id/page.tsx so the PDF
// output matches what the user already previews in the app.
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { COLORS } from "./reportStyles";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  card: {
    width: 380,
    borderRadius: 8,
    overflow: "hidden",
    border: `1 solid ${COLORS.border}`,
  },
  header: {
    backgroundColor: COLORS.blue,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: { color: "#FFFFFF" },
  eyebrow: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1, opacity: 0.85 },
  barangayName: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginTop: 2 },
  cityLine: { fontSize: 8, opacity: 0.85, marginTop: 1 },
  body: { flexDirection: "row", padding: 16, gap: 12 },
  photoBox: {
    width: 70,
    height: 84,
    borderRadius: 4,
    border: `1 solid ${COLORS.border}`,
    backgroundColor: COLORS.bgLight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: { fontSize: 7, color: COLORS.grayLight },
  info: { flex: 1 },
  label: { fontSize: 7, textTransform: "uppercase", color: COLORS.grayLight, marginBottom: 1 },
  name: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 6 },
  fieldValue: { fontSize: 9, color: COLORS.ink },
  footer: {
    borderTop: `1 solid ${COLORS.border}`,
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idNumber: { fontSize: 10, fontWeight: 700, fontFamily: "Courier" },
  validUntil: { fontSize: 7, color: COLORS.grayLight, marginTop: 2 },
  signatureBlock: { marginTop: 28, alignItems: "center" },
  signatureLine: { width: 160, borderTop: `1 solid ${COLORS.ink}`, marginBottom: 3 },
  signatureLabel: { fontSize: 7, color: COLORS.gray, textAlign: "center" },
});

export interface BarangayIdPDFProps {
  idNumber: string;
  fullName: string;
  address: string;
  birthdateFormatted: string;
  age: number;
  sexShort: "M" | "F";
  civilStatus: string;
  issuedDateFormatted: string;
  validUntilFormatted: string;
  barangayName: string;
  city: string;
  province: string;
  captainName: string;
  captainPosition: string;
}

export default function BarangayIdPDF({
  idNumber,
  fullName,
  address,
  birthdateFormatted,
  age,
  sexShort,
  civilStatus,
  issuedDateFormatted,
  validUntilFormatted,
  barangayName,
  city,
  province,
  captainName,
  captainPosition,
}: BarangayIdPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.eyebrow}>Republic of the Philippines</Text>
              <Text style={s.barangayName}>{barangayName}</Text>
              <Text style={s.cityLine}>{city}, {province}</Text>
            </View>
          </View>

          <View style={s.body}>
            <View style={s.photoBox}>
              <Text style={s.photoLabel}>Photo</Text>
            </View>
            <View style={s.info}>
              <Text style={s.label}>Name</Text>
              <Text style={s.name}>{fullName}</Text>

              <View style={s.grid}>
                <View style={s.field}>
                  <Text style={s.label}>Address</Text>
                  <Text style={s.fieldValue}>{address}</Text>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Birthdate</Text>
                  <Text style={s.fieldValue}>{birthdateFormatted}</Text>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Age / Sex</Text>
                  <Text style={s.fieldValue}>{age} / {sexShort}</Text>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Civil Status</Text>
                  <Text style={s.fieldValue}>{civilStatus}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.footer}>
            <View>
              <Text style={s.idNumber}>{idNumber}</Text>
              <Text style={s.validUntil}>Valid until {validUntilFormatted}</Text>
            </View>
            <Text style={s.validUntil}>Issued {issuedDateFormatted}</Text>
          </View>
        </View>

        <View style={s.signatureBlock}>
          <View style={s.signatureLine} />
          <Text style={s.signatureLabel}>{captainName}</Text>
          <Text style={s.signatureLabel}>{captainPosition}</Text>
        </View>
      </Page>
    </Document>
  );
}