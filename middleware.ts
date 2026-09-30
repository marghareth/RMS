// FILE: middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessRoute } from "@/lib/route-permissions";
import { isAllowedDuringMfaSetup, isMfaEnforcementOn } from "@/lib/mfa-policy";

// Two gates run here on top of "must be signed in":
//
//  1. MFA enrollment (ADMIN / CAPTAIN): until the account has enabled TOTP,
//     everything except the enrollment page and its API is off limits.
//     Pages redirect to /account/security; API calls get a 403 JSON error.
//
//  2. Page-level RBAC: each dashboard URL prefix maps to the permission it
//     needs (src/lib/route-permissions.ts). A role without it is sent to
//     /access-denied instead of getting the page shell. API routes are NOT
//     re-checked here — each one calls requirePermission() itself, which is
//     the real, database-verified authority (see src/lib/session.ts).
//
// The role in the token can lag the database by up to ~1 minute (see
// TOKEN_REFRESH_MS in src/lib/auth.ts), which is acceptable for a page
// shell guard: the data behind it is protected by the API check.
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const isApi = pathname.startsWith("/api/");

    // Already logged in and trying to view the login page → send to dashboard
    if (token && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!token) return NextResponse.next(); // `authorized` below handles this case

    if (token.mfaSetupRequired && isMfaEnforcementOn() && !isAllowedDuringMfaSetup(pathname)) {
      if (isApi) {
        return NextResponse.json(
          {
            error: "MFA_SETUP_REQUIRED",
            message: "Two-factor authentication must be enabled for this account before continuing.",
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/account/security?setup=required", req.url));
    }

    if (!isApi && !canAccessRoute(token.role, pathname)) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Let unauthenticated users through to /login and to certificate
        // verification (/verify, /api/verify) — that page is meant for
        // outside parties (employers, agencies) checking a printed
        // certificate's authenticity, who won't have an RMS account.
        if (req.nextUrl.pathname.startsWith("/login")) return true;
        if (req.nextUrl.pathname.startsWith("/verify")) return true;
        if (req.nextUrl.pathname.startsWith("/api/verify")) return true;
        // Keep-alive ping (see src/app/api/ping/route.ts) is hit by an
        // external cron job with no session — must stay public.
        if (req.nextUrl.pathname.startsWith("/api/ping")) return true;
        // `invalid` is set by the jwt callback when the account has been
        // deleted or deactivated since the token was issued.
        return !!token && !token.invalid;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protects everything except: /login, /verify, /api/auth/*, /api/verify,
  // /api/ping, static assets, and Next.js internals. Add more public
  // paths here if needed.
  matcher: [
    "/((?!login|verify|api/auth|api/verify|api/ping|_next/static|_next/image|favicon.ico).*)",
  ],
};