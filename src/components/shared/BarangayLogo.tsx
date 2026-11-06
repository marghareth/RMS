// FILE: src/components/shared/BarangayLogo.tsx
//
// The barangay's own logo (General Settings → Barangay Logo), for the
// sidebar header and the login page. Shows `fallback` (the built-in house
// mark) until the logo has loaded, and keeps showing it when none has been
// uploaded, so there's never a broken-image icon.
//
// Settings dispatches BRANDING_UPDATED after saving, so a new upload shows
// up straight away without reloading the page.
"use client";

import { useEffect, useState } from "react";

export const BRANDING_UPDATED = "rms:branding-updated";

export default function BarangayLogo({
  className = "h-8 w-8",
  fallback,
}: {
  className?: string;
  fallback: React.ReactNode;
}) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");

  useEffect(() => {
    const bump = () => {
      setState("loading");
      setVersion((v) => v + 1);
    };
    window.addEventListener(BRANDING_UPDATED, bump);
    return () => window.removeEventListener(BRANDING_UPDATED, bump);
  }, []);

  return (
    <>
      {state !== "ok" && fallback}
      {state !== "none" && (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own API route, nothing for next/image to optimise
        <img
          key={version}
          src={`/api/branding/logo?v=${version}`}
          alt="Barangay logo"
          className={`${className} shrink-0 object-contain ${state === "ok" ? "" : "hidden"}`}
          onLoad={() => setState("ok")}
          onError={() => setState("none")}
        />
      )}
    </>
  );
}