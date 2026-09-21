// FILE: src/app/verify/page.tsx
//
// NEW FILE — this page never existed. The login page has always linked to
// "/verify" (see src/app/(auth)/login/page.tsx, "Verify a certificate"),
// and the API side (/api/verify/[code]/route.ts) and middleware.ts both
// already treat "/verify" as a public route — but no page component ever
// backed either "/verify" or "/verify/[code]", so both 404'd. This is the
// landing page: a public visitor pastes/types the verification code
// printed on a released certificate (or the full verify URL/QR target)
// and is routed to /verify/[code], which does the actual lookup.
//
// No auth required — matches middleware.ts's public allowlist for this
// path. Kept intentionally minimal and on-brand with the login page
// (same black/white/gray palette, same mark) since this is the same
// "outside party checking a printed certificate" audience.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function VerifyLandingPage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Accept either a bare code or a full pasted URL (e.g. from a QR code
    // or a copied link) that ends in the code — take whatever's after the
    // last "/" so both work the same way.
    const code = trimmed.includes("/") ? trimmed.split("/").filter(Boolean).pop()! : trimmed;
    router.push(`/verify/${encodeURIComponent(code)}`);
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-white px-8 py-10">
      <div />

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-85">
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="mb-8">
            <path d="M12 0L2 13h7l-2 11 11-14h-7l1-10z" fill="#0A0A0A" />
          </svg>

          <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0A0A0A]">
            <ShieldCheck size={20} className="text-white" />
          </div>

          <h1 className="text-[28px] font-bold leading-tight text-[#0A0A0A]">
            Verify a certificate
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            Enter the verification code printed on the certificate to confirm it was genuinely issued by this barangay.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Verification code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              required
              className="w-full rounded-lg border border-[#E5E5E5] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] transition focus:border-[#0A0A0A] focus:outline-none"
            />

            <button
              type="submit"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A0A0A] py-3 text-sm font-semibold text-white transition hover:bg-[#262626]"
            >
              Verify
            </button>
          </form>

          <p className="mt-5 text-xs text-[#737373]">
            The code is printed near the bottom of the certificate, or embedded in its QR code.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-[#A3A3A3]">
        <span>Brgy-RMS</span>
        <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" />
        <Link href="/login" className="hover:text-[#0A0A0A]">
          Staff login
        </Link>
      </div>
    </div>
  );
}