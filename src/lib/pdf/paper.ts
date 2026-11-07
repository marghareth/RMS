// FILE: src/lib/pdf/paper.ts
//
// Paper sizes a certificate can be printed on (Nov 2026). The PDF used to
// be A4 only, so printing it on Letter paper at actual size cut off the
// bottom (certificate number and QR code). Staff now pick the paper on the
// certificate preview page and the PDF is laid out for exactly that sheet.
//
// Sizes are in PDF points (1 in = 72 pt). Shared by the PDF route, the PDF
// layout and the preview page, so it must not import react-pdf.

export const PAPER_SIZES = {
  A4: { label: "A4", detail: "210 × 297 mm", pt: [595.28, 841.89] as [number, number] },
  LETTER: { label: "Letter", detail: "8.5 × 11 in", pt: [612, 792] as [number, number] },
  FOLIO: { label: "Long / Folio", detail: "8.5 × 13 in", pt: [612, 936] as [number, number] },
  LEGAL: { label: "Legal", detail: "8.5 × 14 in", pt: [612, 1008] as [number, number] },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

export const DEFAULT_PAPER: PaperSize = "A4";

/** A paper size from a query string or saved preference; anything unknown → A4. */
export function parsePaper(value: string | null | undefined): PaperSize {
  const v = (value ?? "").toUpperCase();
  return v in PAPER_SIZES ? (v as PaperSize) : DEFAULT_PAPER;
}

/**
 * How much to stretch or tighten the vertical spacing so the certificate
 * fills the sheet: 1 on A4, a little less on Letter, more on Long/Legal.
 * Kept within a range so text never gets cramped or floats apart.
 */
export function verticalScale(paper: PaperSize): number {
  const height = PAPER_SIZES[paper].pt[1];
  return Math.min(1.35, Math.max(0.8, height / PAPER_SIZES.A4.pt[1]));
}