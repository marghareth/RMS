// Shared @react-pdf/renderer styles for report PDFs, matching the app's
// brand tokens (blue accent, gray text scale) so generated documents feel
// consistent with the on-screen UI.
import { StyleSheet, Font } from "@react-pdf/renderer";

export const COLORS = {
  blue: "#3B82F6",
  blueDark: "#1D4ED8",
  ink: "#1F2937",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E9EAEC",
  bgLight: "#F9FAFB",
};

export const reportStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.ink,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `2 solid ${COLORS.ink}`,
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "column" },
  barangayName: { fontSize: 14, fontWeight: 700, textTransform: "uppercase" },
  headerSub: { fontSize: 8, color: COLORS.gray, marginTop: 2 },
  reportTitle: { fontSize: 16, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 },
  reportMeta: { fontSize: 8, color: COLORS.gray, textAlign: "right" },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    color: COLORS.ink,
  },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1,
    border: `1 solid ${COLORS.border}`,
    borderRadius: 6,
    padding: 10,
  },
  statValue: { fontSize: 16, fontWeight: 700, color: COLORS.blueDark },
  statLabel: { fontSize: 8, color: COLORS.gray, textTransform: "uppercase", marginTop: 2 },
  table: { border: `1 solid ${COLORS.border}`, borderRadius: 4 },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1 solid ${COLORS.border}`,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: { borderBottom: "none" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bgLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: `1 solid ${COLORS.border}`,
  },
  tableCell: { fontSize: 9, flex: 1 },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.gray,
    textTransform: "uppercase",
    flex: 1,
  },
  tableCellRight: { fontSize: 9, flex: 1, textAlign: "right" },
  tableHeaderCellRight: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.gray,
    textTransform: "uppercase",
    flex: 1,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 6,
    fontSize: 7,
    color: COLORS.grayLight,
  },
});