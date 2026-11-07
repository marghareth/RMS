// FILE: src/lib/print-pdf.ts
//
// Printing and downloading the app's generated PDFs (Nov 2026).
//
// printPdf(url) loads the PDF into a hidden frame on the current page and
// opens the browser's print dialog for THAT document — so what prints is
// the certificate / ID itself, not the web page around the button. If the
// browser won't print a framed PDF (some do this for PDFs), it opens the
// PDF in a new tab instead, where the browser's own Print button works.
//
// downloadPdf(url, filename) saves the file instead of opening a tab. The
// PDF routes send it as a download when `?download=1` is added.
//
// Both need the PDF routes to allow same-origin framing — see the
// /api/pdf/:path* rule in next.config.ts.

const FRAME_ID = "rms-print-frame";

function openInNewTab(url: string) {
  // An <a target="_blank"> click is far less likely to be stopped by a
  // pop-up blocker than window.open() called from a timer or callback.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Prints an already-loaded PDF frame. Returns false if the browser refused. */
export function printFrame(frame: HTMLIFrameElement | null | undefined): boolean {
  try {
    const win = frame?.contentWindow;
    if (!win) return false;
    win.focus();
    win.print();
    return true;
  } catch {
    return false;
  }
}

export function printPdf(url: string): void {
  document.getElementById(FRAME_ID)?.remove();

  const frame = document.createElement("iframe");
  frame.id = FRAME_ID;
  frame.title = "Print preview";
  // Not display:none — browsers don't load a PDF into a hidden frame.
  frame.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;"
  );

  let done = false;
  const fallback = window.setTimeout(() => {
    if (!done) {
      done = true;
      openInNewTab(url);
    }
  }, 15000);

  frame.onload = () => {
    if (done) return;
    // Give the browser's PDF viewer a moment to finish drawing the pages.
    window.setTimeout(() => {
      if (done) return;
      done = true;
      window.clearTimeout(fallback);
      if (!printFrame(frame)) openInNewTab(url);
    }, 400);
  };

  frame.src = url;
  document.body.appendChild(frame);
}

export function downloadPdf(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url + (url.includes("?") ? "&" : "?") + "download=1";
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}