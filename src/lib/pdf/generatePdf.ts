// Client-side PDF generation + download helper, built on @react-pdf/renderer.
// Renders a react-pdf <Document> element to a Blob in the browser (no server
// round-trip) and triggers a real file download — this is what actually
// makes an "Export PDF" button produce a downloadable .pdf file, as opposed
// to window.print() which only opens the browser's print dialog.
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function downloadPdf(document: ReactElement<DocumentProps>, filename: string) {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}