// FILE: src/lib/onboarding/pageTours.ts
//
// Per-page mini-tours: unlike steps.ts (the one-time general overview),
// these are scoped to a single page and auto-launch the FIRST time a user
// who's opted into guided tours (answered "yes" on the beginner prompt, or
// manually started the general tour at least once) visits that page —
// tracked per user, per page, same as the general tour. See
// OnboardingProvider.tsx for the launch logic and TourOverlay.tsx for how
// a step's `target` gets resolved and drawn.
//
// ── Adding a tour to another page ──────────────────────────────────────
// 1. In that page's file, add a `data-tour="page-<name>-<thing>"` attribute
//    to 3-6 real elements worth explaining (the primary "add" button, the
//    search bar, a status filter, the results table, etc).
// 2. Add one PageTour entry below with matching `target` selectors.
// 3. That's it — the provider, the Help-icon menu, and the "seen" tracking
//    all pick it up automatically from this array, no other file to touch.
//
// Keep each page tour SHORT (3-5 steps) — it's a "here's what's on this
// page" orientation, not a full manual. `hint` is optional and, same as
// steps.ts, should read as something to actually try right now.

import type { TourStep } from "./types";

export interface PageTour {
  /** Used as the per-user "seen this page tour" storage key — keep stable once shipped. */
  id: string;
  /** Which pathname(s) this applies to. */
  match: (pathname: string) => boolean;
  /** Short label shown in the Help-icon menu, e.g. "Residents". */
  label: string;
  steps: TourStep[];
}

function exact(path: string) {
  return (pathname: string) => pathname === path;
}

export const PAGE_TOURS: PageTour[] = [
  {
    id: "residents",
    match: exact("/residents"),
    label: "Residents",
    steps: [
      {
        id: "residents-add",
        target: '[data-tour="page-residents-add"]',
        placement: "left",
        title: "Register a resident",
        body: "Every household member's record starts here — name, birth date, contact info, and which household they belong to.",
        hint: "Try it: click to open the registration form.",
      },
      {
        id: "residents-search",
        target: '[data-tour="page-residents-search"]',
        placement: "bottom",
        title: "Find someone fast",
        body: "Search by first or last name — the list filters as you type.",
      },
      {
        id: "residents-filter",
        target: '[data-tour="page-residents-filter"]',
        placement: "left",
        title: "Narrow it down",
        body: "Filter by sex, civil status, or Purok when the full list gets long.",
      },
      {
        id: "residents-table",
        target: '[data-tour="page-residents-table"]',
        placement: "top",
        title: "Click any row",
        body: "Opens that resident's full profile — household, contact details, and their certificate history.",
      },
    ],
  },
  {
    id: "households",
    match: exact("/households"),
    label: "Households",
    steps: [
      {
        id: "households-add",
        target: '[data-tour="page-households-add"]',
        placement: "left",
        title: "Add a household",
        body: "Set up a household record before adding its members — you'll assign a head and a Purok here.",
        hint: "Try it: click to start a new household.",
      },
      {
        id: "households-search",
        target: '[data-tour="page-households-search"]',
        placement: "bottom",
        title: "Search by number, address, or head",
        body: "Handy when you already know part of the household number or the head's name.",
      },
      {
        id: "households-table",
        target: '[data-tour="page-households-table"]',
        placement: "top",
        title: "Everything at a glance",
        body: "Purok, household head, member count, and housing type — click a row to see or edit the full household.",
      },
    ],
  },
  {
    id: "certificates",
    match: exact("/certificates"),
    label: "Certificates",
    steps: [
      {
        id: "certificates-add",
        target: '[data-tour="page-certificates-add"]',
        placement: "left",
        title: "Issue a certificate",
        body: "Residency, indigency, clearance, business permit — pick the resident, the type, and it generates a print-ready PDF.",
        hint: "Try it: click to start a new request.",
      },
      {
        id: "certificates-stats",
        target: '[data-tour="page-certificates-stats"]',
        placement: "bottom",
        title: "Keep an eye on the flagged ones",
        body: "\u201CWalk-in / Flagged\u201D means the requester isn't in RBI yet — worth double-checking before releasing.",
      },
      {
        id: "certificates-search",
        target: '[data-tour="page-certificates-search"]',
        placement: "bottom",
        title: "Look one up",
        body: "Search by certificate number, resident name, or purpose.",
      },
      {
        id: "certificates-table",
        target: '[data-tour="page-certificates-table"]',
        placement: "top",
        title: "Track the status",
        body: "Each row shows where a request is — pending, processing, ready for release — click in to move it forward.",
      },
    ],
  },
  {
    id: "blotter",
    match: exact("/blotter"),
    label: "Blotter",
    steps: [
      {
        id: "blotter-add",
        target: '[data-tour="page-blotter-add"]',
        placement: "left",
        title: "File a new case",
        body: "Log a complaint with the complainant, respondent, and incident details — hearings and updates get added afterward.",
        hint: "Try it: click to file a case.",
      },
      {
        id: "blotter-stats",
        target: '[data-tour="page-blotter-stats"]',
        placement: "bottom",
        title: "Where every case stands",
        body: "Filed, ongoing, resolved, or escalated — these counts update the moment a case's status changes.",
      },
      {
        id: "blotter-search",
        target: '[data-tour="page-blotter-search"]',
        placement: "bottom",
        title: "Pull up a case",
        body: "Search by case number, complainant, or respondent.",
      },
    ],
  },
  {
    id: "visitors",
    match: exact("/visitors"),
    label: "Visitor Log",
    steps: [
      {
        id: "visitors-add",
        target: '[data-tour="page-visitors-add"]',
        placement: "left",
        title: "Log a walk-in",
        body: "Record who's visiting and why — you'll check them out again from the same list once they leave.",
        hint: "Try it: click to log a new visitor.",
      },
      {
        id: "visitors-stats",
        target: '[data-tour="page-visitors-stats"]',
        placement: "bottom",
        title: "Who's in the building right now",
        body: "\u201CChecked In Now\u201D is a live count — useful at a glance without scrolling the list.",
      },
      {
        id: "visitors-search",
        target: '[data-tour="page-visitors-search"]',
        placement: "bottom",
        title: "Find a visit",
        body: "Search by visitor name or purpose of visit.",
      },
    ],
  },
];

export function findPageTour(pathname: string): PageTour | undefined {
  return PAGE_TOURS.find((t) => t.match(pathname));
}