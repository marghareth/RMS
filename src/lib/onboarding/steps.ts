// FILE: src/lib/onboarding/steps.ts
//
// The guided tour for new users. Each step points at a real element in the
// dashboard layout via a `data-tour="..."` attribute (see Sidebar.tsx,
// Topbar.tsx, and dashboard/page.tsx for where each attribute lives).
//
// The tour is intentionally role-agnostic: every role sees a slightly
// different sidebar and dashboard (per src/lib/permission.ts), so rather
// than maintaining a separate step list per role, TourOverlay just skips
// any step whose target isn't present in the DOM (e.g. a BHW account has
// no "Documents" nav group, so that step never shows for them). Keep that
// in mind when adding a step: only target something that's reasonable to
// skip gracefully, and keep the body text generic enough that skipping it
// doesn't break the narrative.
//
// `hint` is optional, short, and phrased as something to actually try
// doing right now ("Try typing...", "Try clicking...") — the "chuchu"/demo
// -mode feel the tour is going for. Leave it out for steps that are purely
// informational.

export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  /** CSS selector, matched against a `data-tour` attribute in the DOM. */
  target: string;
  placement: TourPlacement;
  title: string;
  body: string;
  hint?: string;
}

export const ONBOARDING_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: '[data-tour="sidebar-logo"]',
    placement: "right",
    title: "Welcome to Barangay RMS \u{1F44B}",
    body: "This is where your barangay's residents, documents, blotter cases, finances, and more all live in one place. Let's walk through the basics — it only takes about a minute.",
  },
  {
    id: "nav-dashboard",
    target: '[data-tour="nav-dashboard"]',
    placement: "right",
    title: "Home base",
    body: "Dashboard is where you land every time you log in — a live snapshot of what's happening across the barangay today.",
  },
  {
    id: "nav-rbi",
    target: '[data-tour="nav-rbi"]',
    placement: "right",
    title: "Residents & Households",
    body: "Everyone you serve lives under RBI (Registry of Barangay Inhabitants) — residents, households, and deceased records.",
    hint: "Try it: click RBI now to expand the list.",
  },
  {
    id: "nav-documents",
    target: '[data-tour="nav-documents"]',
    placement: "right",
    title: "Certificates & IDs",
    body: "Issuing a residency certificate or a barangay ID happens here, along with the request queue and release tracking.",
  },
  {
    id: "topbar-search",
    target: '[data-tour="topbar-search"]',
    placement: "bottom",
    title: "Find anything, fast",
    body: "This search bar looks across residents, households, and more — no need to click into a module first.",
    hint: "Try it: type a resident's name, then press Enter.",
  },
  {
    id: "topbar-notifications",
    target: '[data-tour="topbar-notifications"]',
    placement: "bottom",
    title: "Stay on top of what's due",
    body: "This bell lights up when something needs attention — overdue equipment returns, upcoming blotter hearings, and the like.",
  },
  {
    id: "dashboard-kpi",
    target: '[data-tour="dashboard-kpi"]',
    placement: "top",
    title: "Your numbers at a glance",
    body: "Total residents, pending document requests, open blotter cases — all live counts. Click any tile to jump straight into that list.",
  },
  {
    id: "dashboard-quick-actions",
    target: '[data-tour="dashboard-quick-actions"]',
    placement: "top",
    title: "Skip the menu, go straight in",
    body: "The most common tasks — adding a resident, issuing a certificate, filing a blotter case — are one click away right here.",
    hint: "Try it: click \u201CNew Resident\u201D to open the form.",
  },
  {
    id: "dashboard-customize",
    target: '[data-tour="dashboard-customize"]',
    placement: "left",
    title: "Make it yours",
    body: "Every widget on this dashboard can be shown or hidden. Click Customize any time you want to change what you see first.",
  },
  {
    id: "topbar-user-menu",
    target: '[data-tour="topbar-user-menu"]',
    placement: "bottom",
    title: "Your account",
    body: "Your name, role, and security settings — including two-factor authentication — live here.",
  },
  {
    id: "topbar-help",
    target: '[data-tour="topbar-help"]',
    placement: "bottom",
    title: "That's it — you're ready!",
    body: "Forgot something? Click this icon any time to replay the tour. Now go ahead and try the app for real.",
  },
];