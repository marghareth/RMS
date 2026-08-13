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
  // Baseline CSP: same-origin by default, but explicitly allow the
  // sub-resources this app is already known to load (Google Fonts CSS —
  // see note in (dashboard)/layout.tsx about removing that; keep this
  // entry only if a self-hosted font migration hasn't happened yet).
  // 'unsafe-eval' is only added in development — Next.js dev tooling
  // needs it, but production React never calls eval() so the real policy
  // stays strict where it actually matters.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
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
  async headers() {
    return [
      {
        // Applies to every route in the app.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;