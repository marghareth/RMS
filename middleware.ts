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