import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isAuth = !!req.nextauth.token;
    const isLoginPage = req.nextUrl.pathname.startsWith("/login");

    // Already logged in and trying to view the login page → send to dashboard
    if (isAuth && isLoginPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protects everything except: /login, /verify, /api/auth/*, /api/verify,
  // static assets, and Next.js internals. Add more public paths here if
  // needed.
  matcher: [
    "/((?!login|verify|api/auth|api/verify|_next/static|_next/image|favicon.ico).*)",
  ],
};