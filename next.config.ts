// FILE: next.config.ts
//
// SECURITY FIX: no security headers were configured anywhere in the app —
// no clickjacking protection, no MIME-sniffing protection, no referrer
// policy, nothing. For a records system with in-page delete/status-change
// actions, missing `X-Frame-Options`/`frame-ancestors` in particular means
// this app could be embedded in a hidden/disguised iframe on a malicious
// page and clickjacked. Adding a conservative baseline set below; loosen
// the CSP only as specific third-party resources actually require it.
//
// DEV FIX: the CSP's `script-src` had no `'unsafe-eval'`, and this whole
// header set was applied unconditionally to every environment. Next.js's
// dev-mode tooling (React Fast Refresh, error-overlay stack-trace
// reconstruction) calls `eval()` — with no 'unsafe-eval' the browser
// blocked it and logged "eval() is not supported in this environment" on
// every page. React never uses eval() in production, so the fix is to
// only relax script-src in development rather than weakening the
// production policy.
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  // Prevents the app from being framed by any other origin — mitigates
  // clickjacking on pages with destructive actions (delete resident,
  // deactivate user, cancel certificate, etc.).
  { key: "X-Frame-Options", value: "DENY" },
  // Stops browsers from MIME-sniffing a response away from its declared
  // Content-Type (e.g. treating an uploaded file as executable script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the full referring URL (which may contain resident
  // names/IDs in query strings) to third parties on outbound links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Forces HTTPS for a full year (including subdomains) once a browser has
  // seen this header once. Harmless in local dev over HTTP — browsers only
  // honor HSTS on secure origins in the first place.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Disable browser features this app never needs, defense-in-depth
  // against a compromised/malicious dependency trying to use them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Baseline CSP: same-origin by default. Fonts (Inter, via
  // @fontsource-variable/inter — see src/app/layout.tsx) are bundled and
  // served from this origin, so no external font-src/style-src allowance
  // for Google Fonts is needed anymore; the migration mentioned in the
  // old version of this comment is done.
  // 'unsafe-eval' is only added in development — Next.js dev tooling
  // needs it, but production React never calls eval() so the real policy
  // stays strict where it actually matters.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The Barangay ID pages used to live at /barangay_id (underscore) while
  // the API used /barangay-id. Everything is hyphenated now; keep old
  // bookmarks working.
  async redirects() {
    return [
      { source: "/barangay_id", destination: "/barangay-id", permanent: true },
      { source: "/barangay_id/:path*", destination: "/barangay-id/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Applies to every route in the app.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // FIX (Nov 2026): the generated PDFs (certificates, IDs, profiles,
        // reports, slips) are shown INSIDE the app's own pages — e.g. the
        // certificate preview embeds /api/pdf/certificate/[id] in an
        // iframe so staff can see and print the real document. The
        // site-wide `X-Frame-Options: DENY` / `frame-ancestors 'none'`
        // above also applied to these responses, so the browser refused
        // to show them ("refused to connect") and Print had nothing to
        // print. For these PDF routes only, framing is allowed by the
        // app's own pages (same origin) and still refused for every other
        // site, so the clickjacking protection stays in place. When two
        // rules set the same header, Next.js uses the last one, so these
        // replace the two framing headers above for /api/pdf/* only.
        source: "/api/pdf/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // A PDF runs no page scripts, so the only rule it needs is who
          // may frame it.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;