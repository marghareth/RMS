// FILE: src/app/verify/[code]/page.tsx
//
// NEW FILE — see src/app/verify/page.tsx for the full backstory: this page
// was referenced by comments in middleware.ts and
// src/app/api/verify/[code]/route.ts as already existing, but it was never
// actually built, only its backing API route was. That's what made every
// "/verify/..." link 404 (including the one on the login page, and any QR
// code printed on a released certificate pointing here).
//
// Public, unauthenticated — matches middleware.ts's allowlist for this
// path and the API route's "anything returned here should be treated as
// public" note. Deliberately shows only what GET /api/verify/[code]
// returns (never a full resident/finance record).
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { DEFAULT_CERTIFICATE_TEMPLATES, type CertificateTypeValue } from "@/lib/certificateTemplateDefaults";

interface VerifyResult {
  valid: boolean;
  certificate_no?: string;
  certificate_type?: CertificateTypeValue;
  issued_at?: string | null;
  holder_name?: string | null;
}

export default function VerifyResultPage() {
  const { code } = useParams<{ code: string }>();

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [loadedCode, setLoadedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/verify/${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (res.status === 429) {
          throw new Error("Too many checks from this connection. Please try again in a few minutes.");
        }
        if (!res.ok) throw new Error("Something went wrong. Please try again.");
        return res.json() as Promise<VerifyResult>;
      })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setError("");
          setLoadedCode(code);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setResult(null);
          setError(e.message || "Something went wrong. Please try again.");
          setLoadedCode(code);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const loading = loadedCode !== code;

  const typeLabel = result?.certificate_type
    ? DEFAULT_CERTIFICATE_TEMPLATES[result.certificate_type]?.title ?? result.certificate_type
    : null;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-white px-8 py-10">
      <div />

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-85">
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="mb-8">
            <path d="M12 0L2 13h7l-2 11 11-14h-7l1-10z" fill="#0A0A0A" />
          </svg>

          {loading && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 size={22} className="animate-spin text-[#A3A3A3]" />
              <p className="text-sm text-[#737373]">Checking this certificate…</p>
            </div>
          )}

          {!loading && error && (
            <>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
                <XCircle size={20} className="text-red-500" />
              </div>
              <h1 className="text-[22px] font-bold leading-tight text-[#0A0A0A]">Couldn&apos;t check that code</h1>
              <p className="mt-2 text-sm text-[#737373]">{error}</p>
            </>
          )}

          {!loading && !error && result && !result.valid && (
            <>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
                <XCircle size={20} className="text-red-500" />
              </div>
              <h1 className="text-[22px] font-bold leading-tight text-[#0A0A0A]">Not a valid certificate</h1>
              <p className="mt-2 text-sm text-[#737373]">
                This code doesn&apos;t match a released certificate on file with this barangay. Double-check the code, or
                contact the barangay office directly if you believe this is a mistake.
              </p>
            </>
          )}

          {!loading && !error && result && result.valid && (
            <>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <h1 className="text-[22px] font-bold leading-tight text-[#0A0A0A]">Certificate verified</h1>
              <p className="mt-2 text-sm text-[#737373]">
                This certificate was genuinely issued by this barangay.
              </p>

              <div className="mt-6 flex flex-col gap-3 rounded-lg border border-[#E5E5E5] p-4 text-sm">
                {typeLabel && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#737373]">Type</span>
                    <span className="text-right font-medium text-[#0A0A0A]">{typeLabel}</span>
                  </div>
                )}
                {result.certificate_no && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#737373]">Certificate No.</span>
                    <span className="text-right font-medium text-[#0A0A0A]">{result.certificate_no}</span>
                  </div>
                )}
                {result.holder_name && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#737373]">Issued to</span>
                    <span className="text-right font-medium text-[#0A0A0A]">{result.holder_name}</span>
                  </div>
                )}
                {result.issued_at && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#737373]">Date issued</span>
                    <span className="text-right font-medium text-[#0A0A0A]">
                      {new Date(result.issued_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-[#A3A3A3]">
        <span>Brgy-RMS</span>
        <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" />
        <Link href="/verify" className="hover:text-[#0A0A0A]">
          Check another code
        </Link>
      </div>
    </div>
  );
}