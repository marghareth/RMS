// FILE: src/app/(dashboard)/layout.tsx
"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

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
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      className="flex h-screen bg-[#F4F5F7] overflow-hidden"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
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
  );
}