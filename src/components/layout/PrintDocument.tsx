// FILE: src/components/layout/PrintDocument.tsx
//
// Makes a printed page read like a barangay document instead of a copy of
// the screen (Nov 2026). Shown only on paper (hidden print:block):
//
//   PrintLetterhead  top of the first page: Republic of the Philippines /
//                    province and city / Barangay name, a double rule, then
//                    one line with the filters that were on screen (year,
//                    month, tab, search, date range) and who printed it, when.
//                    The dropdowns and tabs themselves are hidden in print
//                    (globals.css), so this line is how the paper says what
//                    it covers.
//   PrintSignOff     end of the document: "Prepared by" (the signed-in user's
//                    full name and position from Account › Your name; blank
//                    line if none, never the username) and "Noted by" (the
//                    active Punong Barangay).
//
// Filters are read from the page just before printing ("beforeprint"),
// from: <select> (chosen option), search boxes, date inputs, the selected
// tab ([role=tab][aria-selected=true]), and any element with a
// data-print-filter attribute (DateRangeFilter sets one). flushSync makes
// sure the line is on the page before the browser lays out the printout.
"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useBarangayInfo } from "@/lib/hooks/useBarangayInfo";
import { useSafeSession } from "@/lib/hooks/useSafeSession";

function visible(el: Element) {
  return (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0;
}

/** Plain-words list of what the page is filtered to right now. */
export function readScreenFilters(root: ParentNode): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (v: string | null | undefined) => {
    const t = v?.replace(/\s+/g, " ").trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };

  root.querySelectorAll('[role="tab"][aria-selected="true"]').forEach((tab) => {
    if (!visible(tab)) return;
    // ListTabs puts the count in its own <span>; keep only the label.
    const label = Array.from(tab.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join("");
    add(label || tab.textContent);
  });
  root.querySelectorAll("select").forEach((sel) => {
    if (!visible(sel)) return;
    add(sel.selectedOptions[0]?.textContent);
  });
  root.querySelectorAll<HTMLInputElement>('input:not([type]), input[type="search"], input[type="text"]').forEach((input) => {
    if (!visible(input) || !input.value.trim()) return;
    if (!/search/i.test(input.placeholder + " " + (input.getAttribute("aria-label") ?? ""))) return;
    add(`Search: “${input.value.trim()}”`);
  });
  root.querySelectorAll<HTMLInputElement>('input[type="date"], input[type="month"]').forEach((input) => {
    if (!visible(input) || !input.value) return;
    const label = input.getAttribute("aria-label") || input.closest("label")?.textContent?.replace(input.value, "") || "Date";
    add(`${label.trim()}: ${input.value}`);
  });
  root.querySelectorAll("[data-print-filter]").forEach((el) => add(el.getAttribute("data-print-filter")));
  return out;
}

/** Used under the name when no position was set. */
const ROLE_TITLE: Record<string, string> = {
  ADMIN: "System Administrator",
  CAPTAIN: "Punong Barangay",
  SECRETARY: "Barangay Secretary",
  KAGAWAD: "Barangay Kagawad",
  BHW: "Barangay Health Worker",
  ENCODER: "Records Encoder",
};

function printedOn(d: Date) {
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PrintLetterhead() {
  const { barangay } = useBarangayInfo();
  const { data: session } = useSafeSession();
  const [filters, setFilters] = useState<string[]>([]);
  const [when, setWhen] = useState<Date | null>(null);

  useEffect(() => {
    const before = () => {
      const root = document.querySelector('[data-print="page"]') ?? document.body;
      flushSync(() => {
        setFilters(readScreenFilters(root));
        setWhen(new Date());
      });
    };
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  }, []);

  const name = barangay.name.trim().replace(/^barangay\s+/i, "");
  const place = [barangay.province && `Province of ${barangay.province.replace(/^province of\s+/i, "")}`, barangay.city]
    .filter(Boolean)
    .join(" · ");
  const user = session?.user?.username;

  return (
    <header className="print-letterhead hidden print:block">
      <div className="text-center">
        <p className="text-[9.5pt]">Republic of the Philippines</p>
        {place && <p className="text-[9.5pt]">{place}</p>}
        <p className="mt-0.5 text-[14pt] font-bold">{name ? `Barangay ${name}` : "Barangay"}</p>
      </div>
      <div className="print-double-rule" />
      <div className="flex justify-between gap-6 text-[8.5pt] text-[#333]">
        <p>{filters.length ? <>Covers: {filters.join(" · ")}</> : null}</p>
        <p className="shrink-0 text-right">
          {when ? `Printed ${printedOn(when)}` : null}
          {when && user ? ` by ${user}` : null}
        </p>
      </div>
    </header>
  );
}

export function PrintSignOff() {
  const { captain } = useBarangayInfo();
  const { data: session } = useSafeSession();
  const [me, setMe] = useState<{ full_name: string | null; position: string | null } | null>(null);
  const signedIn = !!session?.user;

  // The name and position the user set on Account › Your name (or an Admin
  // set on Admin › Users). Without one, the name line is left blank to be
  // written by hand — never the username.
  useEffect(() => {
    if (!signedIn) return;
    let ignore = false;
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!ignore && u) setMe({ full_name: u.full_name ?? null, position: u.position ?? null });
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [signedIn]);

  const role = session?.user?.role ? ROLE_TITLE[session.user.role] ?? "" : "";

  return (
    <footer className="print-signoff hidden print:grid">
      <div>
        <p className="text-[9pt]">Prepared by:</p>
        <div className="print-sign-line" />
        <p className="text-[10pt] font-semibold">{me?.full_name || "\u00A0"}</p>
        <p className="text-[8.5pt] text-[#444]">{me?.position || role || "Signature over printed name"}</p>
      </div>
      <div>
        <p className="text-[9pt]">Noted by:</p>
        <div className="print-sign-line" />
        <p className="text-[10pt] font-semibold">{captain.name || "\u00A0"}</p>
        <p className="text-[8.5pt] text-[#444]">{captain.position || "Punong Barangay"}</p>
      </div>
    </footer>
  );
}