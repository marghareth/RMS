// FILE: src/lib/pdf/listExport.ts
//
// Turns a ListExportPDF into an HTTP download (Nov 2026). Shared by the
// Residents and Households exports when ?format=pdf is asked for.
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import ListExportPDF, { type ListExportPDFProps } from "./ListExportPDF";

/** "?format=pdf" → "pdf"; anything else (or nothing) → "xlsx". */
export function readExportFormat(params: URLSearchParams): "pdf" | "xlsx" {
  return params.get("format")?.toLowerCase() === "pdf" ? "pdf" : "xlsx";
}

/** "Quisol" or "Barangay Quisol" → "Barangay Quisol". */
export function barangayHeading(name: string) {
  const n = name.trim().replace(/^barangay\s+/i, "");
  return n ? `Barangay ${n}` : "Barangay";
}

export async function listPdfResponse(props: ListExportPDFProps, filename: string) {
  const buffer = await renderToBuffer(
    createElement(ListExportPDF, props) as Parameters<typeof renderToBuffer>[0]
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}