// FILE: src/app/(dashboard)/layout.tsx
"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import TourOverlay from "@/components/onboarding/TourOverlay";
import BeginnerPromptModal from "@/components/onboarding/BeginnerPromptModal";
// TEST: dashboard-only typeface trial (Manrope, in place of the site-wide
// Inter). Self-hosted the same way Inter is — via a Fontsource variable
// package, bundled from npm at install time, not fetched from a
// third-party CDN at request time — deliberately avoiding the exact
// mistake called out below and already fixed once in src/app/layout.tsx
// for the same reason (no third-party font-CDN calls from an internal
// records-management system).
import "@fontsource-variable/manrope";

// FIX: this file was pulling "Google Sans" from fonts.googleapis.com on
// every dashboard load. Two problems with that:
//   1. Its own comment said it was a one-off typeface TEST — leftover
//      experimental code, not a real decision, sitting in the shipped
//      layout.
//   2. It made every authenticated user's browser send a request (with
//      referrer/IP) to a third-party CDN on every session, added an
//      external point of failure with no fallback/self-hosting, and never
//      even set up a `preconnect` for it. For an internal
//      records-management system this is an unnecessary external
//      dependency and a minor privacy leak.
// Reverted to the system font stack; if a custom typeface is wanted later
// it should be self-hosted (e.g. via `next/font/local`) rather than
// fetched from a third-party CDN on every page load.

// The Manrope test used to be a plain inline `fontFamily` style on the
// wrapping <div> below. That covers everything actually nested under this
// layout in the React tree — but NOT the Sheet/Dialog components used
// throughout the dashboard (residents, households, blotter, etc.):
// src/components/ui/sheet.tsx portals its content straight to <body> (see
// @base-ui/react's DialogPortal — "the portal element is appended to
// <body>" by default), which makes it a *sibling* of this div in the DOM,
// not a descendant. An inline style on the div simply never reaches it.
//
// Fixed by overriding the shared `--font-sans` CSS custom property on
// <html> instead, for as long as this layout is mounted. `<body>` already
// renders with the `font-sans` utility class (see src/app/layout.tsx),
// which resolves `var(--font-sans)` — and CSS custom properties cascade
// through the whole document, portaled nodes included, since they're
// still descendants of <html> even when they're not descendants of this
// div. Login/verify pages never mount this layout, so they never run this
// effect and keep rendering with the default `--font-sans` (Inter) from
// globals.css — same contained, reversible test as before, just scoped at
// the right level.
const DASHBOARD_FONT_STACK =
  "'Manrope Variable', var(--font-inter), ui-sans-serif, system-ui, sans-serif";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // On phones/tablets the rail renders as an overlay drawer (see
  // Sidebar.tsx), so it should start closed there. Starting from `false`
  // (open) on every render — matching what the server always renders,
  // since it has no viewport to check — and closing it here, once, after
  // mount avoids a hydration mismatch; on desktop this effect is a no-op.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const frame = window.requestAnimationFrame(() => setCollapsed(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Apply the Manrope test only while a dashboard route is mounted, and
  // clean up on unmount (navigating to /login, /verify, etc.) so those
  // pages are never affected and there's no leftover global state between
  // route changes. useLayoutEffect (not useEffect) so this runs before
  // the browser paints — otherwise every dashboard page load would flash
  // Inter for a frame before swapping to Manrope, the same class of bug
  // the NO_FLASH_THEME_SCRIPT in src/app/layout.tsx already exists to
  // avoid for dark mode.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--font-sans", DASHBOARD_FONT_STACK);
    return () => {
      document.documentElement.style.removeProperty("--font-sans");
    };
  }, []);

  return (
    <OnboardingProvider>
      <div className="flex h-screen bg-[#F4F5F7] overflow-hidden dark:bg-[#0A0A0A]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar onMenuClick={() => setCollapsed(!collapsed)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-6 py-6 sm:px-8 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <BeginnerPromptModal />
      <TourOverlay />
    </OnboardingProvider>
  );
}