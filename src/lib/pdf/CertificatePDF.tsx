// FILE: src/lib/pdf/CertificatePDF.tsx
//
// Server-rendered PDF for a single issued certificate, built with
// @react-pdf/renderer. Used by GET /api/pdf/certificate/[id]; the on-screen
// preview (certificates/[id]/preview) shows this same PDF, so what's
// previewed, printed and downloaded is one document.
//
// Nov 2026: laid out like the standard barangay clearance (framed):
//   ┌──────────────────────────────────────────────────────┐
//   │ [seal]        Republic of the Philippines             │
//   │                   Province of …                       │
//   │                 Municipality of …                     │
//   │               𝓑𝓪𝓻𝓪𝓷𝓰𝓪𝔂 …  (script)                     │
//   │══════════════════════════════════════════════════════│
//   │            OFFICE OF THE PUNONG BARANGAY              │
//   │                 BARANGAY CLEARANCE                    │
//   │ TO WHOM IT MAY CONCERN:                               │
//   │      This is to certify that … (justified)            │
//   │      ISSUED this 4th day of November, 2026 at …       │
//   │                                   JUAN DELA CRUZ       │
//   │                                   Punong Barangay      │
//   │ O.R No.  ______                                       │
//   │ Date Issued: November 4, 2026                         │
//   │ Doc. Stamp: Paid                                      │
//   │ cert no. · notes                               [QR]   │
//   └──────────────────────────────────────────────────────┘
// PAPER SIZE (Nov 2026): the page used to be A4 only, so printing on
// Letter at actual size cut off the bottom. The page is now laid out on the
// paper picked on the preview page (A4, Letter, Long/Folio 8.5×13, Legal —
// src/lib/pdf/paper.ts). The frame and footer are pinned to the page edges,
// so they follow the sheet; the gaps between sections stretch or tighten
// with the sheet's height so the certificate fills it.
// The seal comes from General Settings → Barangay Logo (logo_barangay).
// Until one is uploaded nothing is printed in its place and the letterhead
// is text only.
// react-pdf's Image is imported as PdfImage: it has no alt prop (PDFs have no
// alt text), and the name "Image" makes the jsx-a11y/alt-text rule mistake it
// for next/image.
import { Document, Page, Text, View, StyleSheet, Image as PdfImage, Font } from "@react-pdf/renderer";
import type { LetterheadOfficial } from "@/lib/barangay-info";
import { TANGERINE_BOLD_WOFF } from "@/lib/pdf/fonts/tangerine-bold";
import { PAPER_SIZES, DEFAULT_PAPER, verticalScale, type PaperSize } from "@/lib/pdf/paper";

// Never split words with a hyphen ("mar-ried"); wrap whole words only.
Font.registerHyphenationCallback((word) => [word]);
// Script face for the barangay name in the letterhead.
Font.register({ family: "Tangerine", fontWeight: "bold", src: TANGERINE_BOLD_WOFF });

const NAVY = "#1F3A93";
const INK = "#111111";
const GRAY = "#555555";
const RULE = "#6B6B6B";

const s = StyleSheet.create({
  // paddingBottom keeps the flowing text clear of the footer (certificate
  // number + QR), which is pinned to the bottom of the sheet.
  page: { paddingTop: 44, paddingBottom: 104, paddingHorizontal: 58, fontFamily: "Times-Roman", fontSize: 12, color: INK },
  frame: { position: "absolute", top: 22, left: 22, right: 22, bottom: 22, border: `1 solid ${INK}` },

  header: { position: "relative", alignItems: "center", textAlign: "center", minHeight: 84, justifyContent: "center" },
  logo: { position: "absolute", left: -10, top: -4, width: 86, height: 86, objectFit: "contain" },
  hLine: { fontFamily: "Times-Roman", fontSize: 11.5, lineHeight: 1.25 },
  hBrgy: { fontFamily: "Tangerine", fontWeight: "bold", fontSize: 38, color: NAVY, marginTop: -2, lineHeight: 1.1 },
  ruleThick: { height: 2.2, backgroundColor: RULE, marginTop: 8, marginHorizontal: -22 },
  ruleThin: { height: 0.6, backgroundColor: RULE, marginTop: 1.8, marginHorizontal: -22 },

  office: { fontFamily: "Times-Bold", fontSize: 13, textAlign: "center", marginTop: 30, textTransform: "uppercase" },
  title: { fontFamily: "Times-Bold", fontSize: 25, textAlign: "center", marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },

  salutation: { fontFamily: "Times-Bold", fontSize: 12, marginTop: 40, marginBottom: 14 },
  para: { fontSize: 12, lineHeight: 1.9, textAlign: "justify", textIndent: 42, marginBottom: 8 },
  strong: { fontFamily: "Times-Bold" },

  signRow: { alignItems: "flex-end", marginTop: 50 },
  sign: { width: 200 },
  captainName: { fontFamily: "Times-Bold", fontSize: 12.5, textTransform: "uppercase" },
  captainPos: { fontSize: 12 },

  fees: { marginTop: 46 },
  feeItem: { flexDirection: "row", alignItems: "flex-end", marginBottom: 3 },
  feeLabel: { fontSize: 11, width: 74 },
  feeBlank: { width: 128, borderBottom: `0.75 solid ${INK}`, height: 12 },
  feeValue: { fontSize: 11 },

  footer: { position: "absolute", left: 58, right: 58, bottom: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footText: { fontFamily: "Helvetica", fontSize: 7, color: GRAY, lineHeight: 1.45 },
  qrBox: { alignItems: "center" },
  qr: { width: 46, height: 46 },
  qrCaption: { fontFamily: "Helvetica", fontSize: 5.5, color: GRAY, marginTop: 1 },
});

interface CertificatePDFProps {
  title: string;
  body: string;
  closing: string;
  purpose: string;
  certificateNo: string;
  queueNumber?: string;
  applicantName: string;
  /** The name as written in the body, made bold there. */
  bodyName?: string;
  flaggedManual: boolean;
  captainName: string;
  captainPosition: string;
  barangayName: string;
  city: string;
  /** "Municipality of …" / "… City"; falls back to `city`. */
  cityLine?: string;
  province: string;
  region: string;
  /** "November 4, 2026" once released; blank line while pending. */
  dateIssued?: string;
  logoBarangay?: string;
  validityNote?: string;
  paid?: boolean;
  /** PNG data URL for the verification QR code (from the `qrcode` package). Omit to render without one. */
  qrDataUrl?: string;
  /** Sheet to lay the certificate out on. Defaults to A4. */
  paper?: PaperSize;
  // Still produced by buildCertificatePdfProps (used by other documents);
  // not printed on this layout.
  barangayAddress?: string;
  barangayContact?: string;
  officials?: LetterheadOfficial[];
  logoCity?: string;
}

function escapeRegExp(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `text` with every occurrence of the given terms (name, purpose) in bold. */
function emphasize(text: string, terms: string[]) {
  const wanted = terms.map((t) => t.trim()).filter((t) => t.length > 1);
  if (wanted.length === 0) return text;
  const re = new RegExp(`(${wanted.map(escapeRegExp).join("|")})`, "g");
  return text.split(re).map((part, i) =>
    wanted.includes(part) ? (
      <Text key={i} style={s.strong}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

/** A closing that starts with "Issued" prints it as a bold "ISSUED", as on the paper form. */
function closingLine(text: string, terms: string[]) {
  const m = /^issued\b/i.exec(text);
  if (!m) return emphasize(text, terms);
  return [
    <Text key="issued" style={s.strong}>
      ISSUED
    </Text>,
    ...[emphasize(text.slice(m[0].length), terms)].flat(),
  ];
}

export default function CertificatePDF({
  title,
  body,
  closing,
  purpose,
  certificateNo,
  queueNumber,
  applicantName,
  bodyName = "",
  flaggedManual,
  captainName,
  captainPosition,
  barangayName,
  city,
  cityLine,
  province,
  dateIssued,
  logoBarangay,
  validityNote,
  paid,
  qrDataUrl,
  paper = DEFAULT_PAPER,
}: CertificatePDFProps) {
  // Gaps between sections, scaled to the sheet's height (1 on A4) — and
  // tightened when the text is long for this sheet, so a certificate stays
  // on one page instead of running into the footer or onto a second page.
  // The text height is estimated (about 95 characters per line at 12 pt on
  // these page widths); the estimate errs on the generous side.
  const paragraphCount = body.split(/\n\s*\n|\n/).filter((p) => p.trim()).length + (closing ? 1 : 0);
  const lineCount = Math.ceil((body.length + closing.length) / 95) + paragraphCount;
  const pageHeight = PAPER_SIZES[paper].pt[1];
  const available = pageHeight - 44 - 104; // inside the top padding and the footer reserve
  const FIXED = 285; // letterhead, title, salutation, signature and fee lines
  const GAPS = 180; // the five scaled gaps at k = 1
  const roomForGaps = available - FIXED - lineCount * 12 * 1.9;
  const k = Math.max(0.35, Math.min(verticalScale(paper), roomForGaps / GAPS));
  // Very long text: also tighten the line spacing a little.
  const lineHeight = roomForGaps / GAPS < 0.35 ? 1.6 : 1.9;
  const gap = (pt: number) => Math.round(pt * k * 10) / 10;
  const terms = [bodyName, purpose];
  const paragraphs = body.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  // Custom templates that never mention the purpose still get it stated.
  const mentionsPurpose = purpose.trim() !== "" && `${body} ${closing}`.toLowerCase().includes(purpose.trim().toLowerCase());
  const office = `OFFICE OF THE ${(captainPosition || "Punong Barangay").toUpperCase()}`;
  const notes = [
    `Certificate No. ${certificateNo}${queueNumber ? `  ·  Control No. ${queueNumber}` : ""}`,
    validityNote,
    "Not valid without the official dry seal of the barangay.",
    flaggedManual ? "Applicant is not yet listed in the barangay RBI." : "",
  ].filter(Boolean);

  return (
    <Document title={`${title} – ${applicantName}`} author={barangayName}>
      <Page size={PAPER_SIZES[paper].pt} style={s.page}>
        <View style={s.frame} fixed />

        {/* Letterhead */}
        <View style={s.header}>
          {logoBarangay ? <PdfImage src={logoBarangay} style={s.logo} /> : null}
          <Text style={s.hLine}>Republic of the Philippines</Text>
          {province ? <Text style={s.hLine}>Province of {province}</Text> : null}
          {cityLine || city ? <Text style={s.hLine}>{cityLine || city}</Text> : null}
          <Text style={s.hBrgy}>{barangayName}</Text>
        </View>
        <View style={s.ruleThick} />
        <View style={s.ruleThin} />

        <Text style={[s.office, { marginTop: gap(30) }]}>{office}</Text>
        <Text style={[s.title, { marginTop: gap(14) }]}>{title}</Text>

        <Text style={[s.salutation, { marginTop: gap(40) }]}>TO WHOM IT MAY CONCERN:</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={[s.para, { lineHeight }]}>
            {emphasize(p, terms)}
          </Text>
        ))}
        {!mentionsPurpose && purpose.trim() ? (
          <Text style={[s.para, { lineHeight }]}>
            This certification is issued for <Text style={s.strong}>{purpose}</Text> and for whatever legal purpose it may serve.
          </Text>
        ) : null}
        {closing ? <Text style={[s.para, { lineHeight }]}>{closingLine(closing, terms)}</Text> : null}

        <View style={[s.signRow, { marginTop: gap(50) }]} wrap={false}>
          <View style={s.sign}>
            <Text style={s.captainName}>{captainName || " "}</Text>
            <Text style={s.captainPos}>{captainPosition || "Punong Barangay"}</Text>
          </View>
        </View>

        <View style={[s.fees, { marginTop: gap(46) }]} wrap={false}>
          <View style={s.feeItem}>
            <Text style={s.feeLabel}>O.R No.</Text>
            <View style={s.feeBlank} />
          </View>
          <View style={s.feeItem}>
            <Text style={s.feeLabel}>Date Issued:</Text>
            {dateIssued ? <Text style={s.feeValue}>{dateIssued}</Text> : <View style={s.feeBlank} />}
          </View>
          <View style={s.feeItem}>
            <Text style={s.feeLabel}>Doc. Stamp:</Text>
            {paid ? <Text style={s.feeValue}>Paid</Text> : <View style={s.feeBlank} />}
          </View>
        </View>

        {/* Footer: reference numbers and the verification QR */}
        <View style={s.footer} fixed>
          <View>
            {notes.map((n) => (
              <Text key={n} style={s.footText}>
                {n}
              </Text>
            ))}
          </View>
          {qrDataUrl ? (
            <View style={s.qrBox}>
              <PdfImage src={qrDataUrl} style={s.qr} />
              <Text style={s.qrCaption}>Scan to verify</Text>
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}