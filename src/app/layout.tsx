// src/app/layout.tsx
import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

// FIX: next/font/google fetches Inter from fonts.googleapis.com at build
// time — same category of problem already called out and fixed in
// (dashboard)/layout.tsx for "Google Sans" (see that file's comment): a
// third-party network dependency at build time, plus a per-session
// privacy leak at runtime for what's meant to be an internal
// records-management system. It made `next build` hard-fail in any
// environment without outbound access to Google's CDN.
//
// Self-hosted instead via @fontsource-variable/inter, which bundles the
// actual woff2 files inside node_modules (fetched once from npm at
// `npm install`, not from Google on every build/request). The variable
// font's family name, "Inter Variable", is wired into the --font-inter
// custom property in globals.css, which --font-sans already falls back
// through — see the @theme block there.

export const metadata: Metadata = {
  title: "Brgy-RMS",
  description: "Barangay Records Management System",
};

// Runs before React hydrates / before first paint, reading the same
// localStorage key ThemeProvider uses ("rms-theme") so the correct theme
// class is already on <html> by the time anything renders — without
// this, the page would always paint light first and then "flash" to dark
// a moment later for users who'd chosen dark mode.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("rms-theme");
    var isDark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}