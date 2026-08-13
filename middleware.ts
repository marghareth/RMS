// FILE: middleware.ts
//
// SECURITY FIX (see src/lib/route-permissions.ts for the full writeup):
// this middleware previously only checked "is there a valid session
// token?" — it never checked whether that user's ROLE was actually
// allowed to view the page they requested. Authorization for pages was
// only implemented as UI — Sidebar.tsx hiding nav links — so any
// authenticated user could navigate directly to e.g. /admin/audit-logs
// or /finance/overview and the page shell would render even though they
// had no permission for the data behind it.
//
// This now cross-checks the requested path against ROUTE_PERMISSIONS
// (using the role embedded in the JWT — no DB call needed, safe to run
// on the Edge runtime) and redirects to /access-denied if the role
// doesn't hold the required permission(s).
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/permission";
import { findRoutePermission } from "@/lib/route-permissions";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const { pathname } = req.nextUrl;
    const isLoginPage = pathname.startsWith("/login");

    // Already logged in and trying to view the login page → send to dashboard
    if (isAuth && isLoginPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Role-based page authorization — only applies to authenticated
    // requests reaching an actual dashboard route (the `authorized`
    // callback below already guarantees `token` exists here for anything
    // other than /login).
    if (isAuth && !isLoginPage && !pathname.startsWith("/access-denied")) {
      const role = (token as any)?.role as string | undefined;
      const required = findRoutePermission(pathname);

      if (required) {
        const allowed = Array.isArray(required)
          ? required.every((p) => hasPermission(role ?? "", p))
          : hasPermission(role ?? "", required);

        if (!allowed) {
          return NextResponse.redirect(new URL("/access-denied", req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Let unauthenticated users through only to /login — everything
        // else covered by `matcher` below requires a valid session token.
        if (req.nextUrl.pathname.startsWith("/login")) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protects everything except: /login, /api/auth/*, static assets, and
  // Next.js internals. Add more public paths here if needed.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};