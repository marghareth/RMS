// FILE: src/components/certificates/CertificateDetails.tsx
//
// The body of a certificate (Nov 2026), under CertificateOverview, shared
// by the full page (/certificates/[id]) and the slide-over
// (CertificateDetailSheet).
//
// REDESIGN: replaces three cramped boxes of icon + ALL-CAPS label rows
// ("Applicant", "Purpose", "Issuance Info") that repeated the certificate
// number, queue number and payment already shown in the header. Now:
//
//   Applicant — the name, one line of facts (age · sex · purok · born),
//               and a link to their RBI record; or the walk-in details.
//   Request   — the purpose (what gets printed), who filed it, when it was
//               released, and a corrected printed name/address if any.
//   Other certificates for this resident — type, purpose, date, status.
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  type CertificateMock,
  certTypeLabel,
  certDisplayDate,
  formatISODateTime,
} from "@/lib/mock/certificates";

const CARD = "rounded-xl border border-[#E9EAEC] bg-white dark:border-[#262626] dark:bg-[#171717]";
const LABEL = "text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]";
const SECTION_TITLE = "text-[14px] font-semibold text-[#1F2937] dark:text-white";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function ageFrom(birthdate: string) {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}
const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

function Facts({ items }: { items: (string | null | undefined)[] }) {
  const shown = items.filter(Boolean) as string[];
  return (
    <p className="mt-1 flex flex-wrap gap-y-1 text-[13px] text-[#4B5563] dark:text-[#D4D4D4]">
      {shown.map((f, i) => (
        <span key={f} className={i > 0 ? "ml-2.5 border-l border-[#E5E7EB] pl-2.5 dark:border-[#333333]" : ""}>
          {f}
        </span>
      ))}
    </p>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-0.5 text-[14px] text-[#1F2937] dark:text-[#E5E5E5]">{children}</dd>
    </div>
  );
}

export default function CertificateDetails({
  certificate: c,
  history,
  onOpenOther,
  layout = "stacked",
}: {
  certificate: CertificateMock;
  /** Other certificates for the same resident (this one excluded). */
  history: CertificateMock[];
  /** Opens another certificate from the history list. */
  onOpenOther: (id: number) => void;
  /** "split": Applicant and Request side by side on wide screens (full page). */
  layout?: "stacked" | "split";
}) {
  const r = c.resident;
  const name = r
    ? [r.fname, r.mname ? `${r.mname[0]}.` : "", r.lname, r.name_extension ?? ""].filter(Boolean).join(" ")
    : c.manual_name || "No name given";

  return (
    <div className="space-y-4">
      <div className={layout === "split" ? "grid grid-cols-1 items-start gap-4 lg:grid-cols-2" : "space-y-4"}>
        {/* ── Applicant ── */}
        <section data-tour="page-certificates-detail-applicant" className={`${CARD} px-5 py-4`}>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className={LABEL}>Applicant</p>
              <p className="mt-0.5 text-[16px] font-semibold text-[#1F2937] dark:text-white">{name}</p>
              {r ? (
                <Facts
                  items={[
                    `${ageFrom(r.birthdate)} years old`,
                    titleCase(r.sex),
                    r.purok?.name ?? "No purok",
                    `Born ${shortDate(r.birthdate)}`,
                  ]}
                />
              ) : (
                <Facts items={[c.manual_address || "No address given"]} />
              )}
            </div>
            {r ? (
              <Link
                href={`/residents/${r.id}`}
                className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-(--brand-fg) hover:underline"
              >
                RBI record #{r.id} <ArrowRight size={14} />
              </Link>
            ) : (
              <p className="shrink-0 text-[12.5px] font-medium text-amber-700 dark:text-amber-400">Walk-in, not yet in the RBI</p>
            )}
          </div>
        </section>

        {/* ── Request ── */}
        <section data-tour="page-certificates-detail-purpose" className={`${CARD} px-5 py-4`}>
          <p className={SECTION_TITLE}>Request</p>
          <dl data-tour="page-certificates-detail-issuance" className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Purpose" wide>
              {c.purpose}
            </Field>
            <Field label="Filed by">{c.issuer?.username ?? "—"}</Field>
            <Field label="Released">
              {c.issued_at ? formatISODateTime(c.issued_at) : <span className="text-[#6B7280] dark:text-[#A3A3A3]">Not yet</span>}
            </Field>
            {(c.override_full_name || c.override_address) && (
              <Field label="Printed differently from the RBI record" wide>
                {[c.override_full_name, c.override_address].filter(Boolean).join(" · ")}
              </Field>
            )}
          </dl>
        </section>
      </div>

      {/* ── Other certificates for this resident ── */}
      <section data-tour="page-certificates-detail-history" className={CARD}>
        <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
          <p className={SECTION_TITLE}>Other certificates for this resident</p>
          {r && history.length > 0 && <p className={LABEL}>{history.length}</p>}
        </div>
        {!r ? (
          <p className="px-5 pb-4 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            Walk-in requests aren&apos;t linked to a resident record, so there&apos;s no history to show.
          </p>
        ) : history.length === 0 ? (
          <p className="px-5 pb-4 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">None yet. This is their first certificate.</p>
        ) : (
          <ul className="divide-y divide-[#F0F1F3] border-t border-[#F0F1F3] dark:divide-[#262626] dark:border-[#262626]">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => onOpenOther(h.id)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-[#1F2937] dark:text-white">{certTypeLabel(h.certificate_type)}</p>
                    <p className="truncate text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">{h.purpose}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={h.status} />
                    <p className="text-[12px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{shortDate(certDisplayDate(h))}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}