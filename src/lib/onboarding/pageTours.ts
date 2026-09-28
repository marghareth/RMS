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

/** Matches /officials/<numeric id>/edit — the only dynamic route with its own tour so far. */
function officialEdit(pathname: string) {
  return /^\/officials\/\d+\/edit$/.test(pathname);
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

  // ─────────────────────────────────────────────────────────────────
  // REPORTS — hub + six report pages.
  //
  // The report pages fetch their data before drawing stats, charts and
  // tables, so those steps set `waitMs` (see TourStep) to give the fetch
  // time to finish instead of being skipped as "missing". The header
  // controls render immediately and use the default wait.
  // ─────────────────────────────────────────────────────────────────
  {
    id: "reports",
    match: exact("/reports"),
    label: "Reports",
    steps: [
      {
        id: "reports-export-all",
        target: '[data-tour="page-reports-export-all"]',
        placement: "bottom",
        title: "Download everything at once",
        body: "Opens a PDF for the certificate, financial, blotter, inventory and registries reports for this year, each in its own browser tab. The Population report has its own export inside it.",
        hint: "If nothing opens, allow pop-ups for this site.",
      },
      {
        id: "reports-stats",
        target: '[data-tour="page-reports-stats"]',
        placement: "bottom",
        title: "This month at a glance",
        body: "Total residents, certificates issued this month, active blotter cases, and this month's net balance (income minus expenses).",
      },
      {
        id: "reports-modules",
        target: '[data-tour="page-reports-modules"]',
        placement: "top",
        title: "Pick a report",
        body: "Each card opens a full report. The line at the bottom of a card is a live figure, so you can tell what's inside before you click.",
        hint: "Try it: click any card to open that report.",
      },
      {
        id: "reports-charts",
        target: '[data-tour="page-reports-charts"]',
        placement: "top",
        title: "Quick charts",
        body: "Population by Purok and Blotter Case Status. \u201CFull Report \u2192\u201D on each chart jumps to the detailed version.",
      },
      {
        id: "reports-certs",
        target: '[data-tour="page-reports-certs"]',
        placement: "top",
        title: "Most-requested certificates",
        body: "The top certificate types issued this month, side by side.",
      },
    ],
  },
  {
    id: "reports-population",
    match: exact("/reports/population"),
    label: "Population Report",
    steps: [
      {
        id: "reports-population-controls",
        target: '[data-tour="page-reports-population-controls"]',
        placement: "bottom",
        title: "Choose a year, then export",
        body: "Pick the year to report on. Export PDF builds a formatted population report you can download, print, or hand to the Captain.",
        hint: "Try it: change the year and watch the numbers update.",
      },
      {
        id: "reports-population-stats",
        target: '[data-tour="page-reports-population-stats"]',
        placement: "bottom",
        title: "Headcount by sex",
        body: "Total registered residents on the left, split by sex on the right.",
        waitMs: 6000,
      },
      {
        id: "reports-population-charts",
        target: '[data-tour="page-reports-population-charts"]',
        placement: "top",
        title: "Who lives here",
        body: "Residents by Purok, age group, civil status, and employment status. Hover a bar or slice for the exact count; the percentages are shares of all residents.",
        waitMs: 6000,
      },
      {
        id: "reports-population-households",
        target: '[data-tour="page-reports-population-households"]',
        placement: "top",
        title: "Households per Purok",
        body: "Residents, households, and the average number of people per household in each Purok \u2014 useful for planning and aid distribution.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "reports-certificates",
    match: exact("/reports/certificates"),
    label: "Certificate Report",
    steps: [
      {
        id: "reports-certificates-controls",
        target: '[data-tour="page-reports-certificates-controls"]',
        placement: "bottom",
        title: "Filter, then export",
        body: "Choose a year and, optionally, a single month. Export PDF opens your browser's print dialog \u2014 pick \u201CSave as PDF\u201D as the destination.",
        hint: "Try it: pick a month to narrow the report.",
      },
      {
        id: "reports-certificates-stats",
        target: '[data-tour="page-reports-certificates-stats"]',
        placement: "bottom",
        title: "Issuance totals",
        body: "Certificates issued this year, this month, and how many different certificate types have been issued.",
        waitMs: 6000,
      },
      {
        id: "reports-certificates-charts",
        target: '[data-tour="page-reports-certificates-charts"]',
        placement: "top",
        title: "By type and by month",
        body: "The bar chart shows which certificates are requested most. The line chart shows how requests rise and fall across the year.",
        waitMs: 6000,
      },
      {
        id: "reports-certificates-recent",
        target: '[data-tour="page-reports-certificates-recent"]',
        placement: "top",
        title: "Latest issuances",
        body: "The most recent certificates with their type, purpose, date, and the staff member who issued them.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "reports-blotter",
    match: exact("/reports/blotter"),
    label: "Blotter Report",
    steps: [
      {
        id: "reports-blotter-controls",
        target: '[data-tour="page-reports-blotter-controls"]',
        placement: "bottom",
        title: "Filter, then export",
        body: "Choose a year and, optionally, a month. Export PDF opens your browser's print dialog \u2014 pick \u201CSave as PDF\u201D as the destination.",
        hint: "Try it: pick a month to see only that period.",
      },
      {
        id: "reports-blotter-stats",
        target: '[data-tour="page-reports-blotter-stats"]',
        placement: "bottom",
        title: "Where the cases stand",
        body: "Total cases, then how many are filed, ongoing, resolved, or escalated for the period you chose.",
        waitMs: 6000,
      },
      {
        id: "reports-blotter-charts",
        target: '[data-tour="page-reports-blotter-charts"]',
        placement: "top",
        title: "Status and trend",
        body: "The ring shows each status as a share of all cases. The bars compare cases filed against cases resolved month by month, so you can see if you're keeping up.",
        waitMs: 6000,
      },
      {
        id: "reports-blotter-recent",
        target: '[data-tour="page-reports-blotter-recent"]',
        placement: "top",
        title: "Recent cases",
        body: "The latest cases with complainant, respondent, status, and filing date. A red warning icon marks a case that was escalated.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "reports-financial",
    match: exact("/reports/financial"),
    label: "Financial Report",
    steps: [
      {
        id: "reports-financial-controls",
        target: '[data-tour="page-reports-financial-controls"]',
        placement: "bottom",
        title: "Filter, then export",
        body: "Choose a year and, optionally, a month. Export PDF opens your browser's print dialog \u2014 pick \u201CSave as PDF\u201D as the destination.",
        hint: "Try it: pick a month to see just that period.",
      },
      {
        id: "reports-financial-stats",
        target: '[data-tour="page-reports-financial-stats"]',
        placement: "bottom",
        title: "The bottom line",
        body: "Total income, total expense, and the net balance (income minus expense) for the period.",
        waitMs: 6000,
      },
      {
        id: "reports-financial-monthly",
        target: '[data-tour="page-reports-financial-monthly"]',
        placement: "top",
        title: "Income vs. expense by month",
        body: "Green bars are income and red bars are expenses. A month where red is taller than green means you spent more than you took in.",
        waitMs: 6000,
      },
      {
        id: "reports-financial-categories",
        target: '[data-tour="page-reports-financial-categories"]',
        placement: "top",
        title: "Where the money goes",
        body: "Income and expenses broken down by category, with amounts, so you can see the biggest sources and the biggest costs.",
        waitMs: 6000,
      },
      {
        id: "reports-financial-recent",
        target: '[data-tour="page-reports-financial-recent"]',
        placement: "top",
        title: "Recent transactions",
        body: "The latest entries with amount, date, and who recorded them. Income shows with a plus sign and expenses with a minus.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "reports-inventory",
    match: exact("/reports/inventory"),
    label: "Inventory Report",
    steps: [
      {
        id: "reports-inventory-controls",
        target: '[data-tour="page-reports-inventory-controls"]',
        placement: "bottom",
        title: "Choose a year, then export",
        body: "Pick the year for the inventory count. Export PDF opens your browser's print dialog \u2014 pick \u201CSave as PDF\u201D as the destination.",
      },
      {
        id: "reports-inventory-stats",
        target: '[data-tour="page-reports-inventory-stats"]',
        placement: "bottom",
        title: "Equipment health",
        body: "Total items, how many are serviceable or unserviceable, how many are missing, and how many are out on loan right now.",
        waitMs: 6000,
      },
      {
        id: "reports-inventory-charts",
        target: '[data-tour="page-reports-inventory-charts"]',
        placement: "top",
        title: "Status and quantities",
        body: "The ring splits equipment by status. The bar chart shows how many of each item you own.",
        waitMs: 6000,
      },
      {
        id: "reports-inventory-list",
        target: '[data-tour="page-reports-inventory-list"]',
        placement: "top",
        title: "The full equipment list",
        body: "Every item with its quantity, status, condition, date acquired, and how many are currently out. A red triangle in the last column means something is overdue.",
        waitMs: 6000,
      },
      {
        id: "reports-inventory-borrowings",
        target: '[data-tour="page-reports-inventory-borrowings"]',
        placement: "top",
        title: "Who has what",
        body: "Recent borrow transactions marked Returned, Out, or Overdue \u2014 handy for chasing equipment that hasn't come back.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "reports-registries",
    match: exact("/reports/registries"),
    label: "Special Registries",
    steps: [
      // This page shows nothing but a loading message until its data
      // arrives, so every step (including the first) waits for the fetch.
      {
        id: "reports-registries-controls",
        target: '[data-tour="page-reports-registries-controls"]',
        placement: "bottom",
        title: "Choose a year, then export",
        body: "Pick the year for the registry figures. Export PDF opens your browser's print dialog \u2014 pick \u201CSave as PDF\u201D as the destination.",
        waitMs: 6000,
      },
      {
        id: "reports-registries-tabs",
        target: '[data-tour="page-reports-registries-tabs"]',
        placement: "bottom",
        title: "Three registries, one page",
        body: "Senior Citizens, PWD, and 4Ps Beneficiaries, each with its total. The highlighted card is the one you're viewing.",
        hint: "Try it: click a different card to switch registries.",
        waitMs: 6000,
      },
      {
        id: "reports-registries-content",
        target: '[data-tour="page-reports-registries-content"]',
        placement: "top",
        title: "Charts and names",
        body: "This area changes with the card you picked: a breakdown by Purok, and for Senior Citizens and PWD a short preview of the people on the registry. 4Ps shows totals and households.",
        waitMs: 6000,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CALENDAR
  // ─────────────────────────────────────────────────────────────────
  {
    id: "calendar",
    match: exact("/calendar"),
    label: "Calendar",
    steps: [
      {
        id: "calendar-add",
        target: '[data-tour="page-calendar-add"]',
        placement: "left",
        title: "Add an event",
        body: "Meetings, holidays, deadlines, assemblies, announcements \u2014 give it a title and a date, and pick a type if you like. It starts on the day you have selected.",
        hint: "Try it: click to open the event form.",
      },
      {
        id: "calendar-nav",
        target: '[data-tour="page-calendar-nav"]',
        placement: "bottom",
        title: "Move between months",
        body: "Use the arrows to go to the previous or next month. Today jumps straight back to the current month and selects today's date.",
      },
      {
        id: "calendar-grid",
        target: '[data-tour="page-calendar-grid"]',
        placement: "top",
        title: "Click any day",
        body: "Blue dots mark days that have events (up to three shown). Today is the filled circle, and the day you select is outlined.",
        hint: "Try it: click a day to see what's scheduled.",
      },
      {
        id: "calendar-day",
        target: '[data-tour="page-calendar-day"]',
        placement: "left",
        title: "Details for the selected day",
        body: "Events on that day appear here with their type and description. Use the pencil to edit one or the trash icon to delete it. An event linked to a meeting says so at the bottom. If the day is empty, you can add an event right from here.",
        hint: "You'll need calendar edit access to save changes; view-only accounts will see a permission message.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // OFFICIALS — directory, Add Official, Edit Official
  // ─────────────────────────────────────────────────────────────────
  {
    id: "officials",
    match: exact("/officials"),
    label: "Officials",
    steps: [
      {
        id: "officials-add",
        target: '[data-tour="page-officials-add"]',
        placement: "left",
        title: "Add an official",
        body: "Pick a resident from the RBI, choose their position and term, and they join the directory. Only Captain and Admin accounts can add, edit, or remove officials.",
        hint: "Try it: click to open the Add Official form.",
      },
      {
        id: "officials-stats",
        target: '[data-tour="page-officials-stats"]',
        placement: "bottom",
        title: "Who's serving",
        body: "Total records, how many are currently active, and the active Punong Barangay. That Captain's name is automatically printed as the signatory on certificates, so keep it up to date.",
      },
      {
        id: "officials-search",
        target: '[data-tour="page-officials-search"]',
        placement: "right",
        title: "Find an official",
        body: "Search by name or position, for example \u201CKagawad\u201D or \u201CTreasurer\u201D.",
      },
      {
        id: "officials-active",
        target: '[data-tour="page-officials-active"]',
        placement: "right",
        title: "Current vs. past officials",
        body: "By default only active officials are listed. Untick this to include those whose term has ended, marked Inactive.",
        hint: "Try it: untick the box to see everyone.",
      },
      {
        id: "officials-list",
        target: '[data-tour="page-officials-list"]',
        placement: "right",
        title: "Pick a name",
        body: "Each row shows the official's position and Purok assignment. Click one to open their details on the right.",
        hint: "Try it: click a name.",
      },
      {
        id: "officials-detail",
        target: '[data-tour="page-officials-detail"]',
        placement: "left",
        title: "Details and actions",
        body: "Shows personal information from their resident record plus their contact, Purok, and term. Edit changes the record. Deactivate ends a term but keeps the history. The trash icon removes the record permanently, so use Deactivate for officials who are simply done serving.",
      },
    ],
  },
  {
    id: "officials-new",
    match: exact("/officials/new"),
    label: "Add Official",
    steps: [
      {
        id: "officials-new-resident",
        target: '[data-tour="page-officials-new-resident"]',
        placement: "bottom",
        title: "Start with the resident",
        body: "Search for the person by name. They must already be in the RBI, and a resident can only hold one official record at a time.",
        hint: "Try it: type a name to search.",
      },
      {
        id: "officials-new-position",
        target: '[data-tour="page-officials-new-position"]',
        placement: "top",
        title: "Position and Purok",
        body: "Choose the official's position. Purok Assignment is optional \u2014 Kagawads are usually assigned a Purok, while others can stay At-Large.",
      },
      {
        id: "officials-new-term",
        target: '[data-tour="page-officials-new-term"]',
        placement: "top",
        title: "Term dates",
        body: "Term Start is required. Leave Term End blank for an ongoing term \u2014 it shows as \u201COngoing\u201D in the directory.",
      },
      {
        id: "officials-new-save",
        target: '[data-tour="page-officials-new-save"]',
        placement: "top",
        title: "Save",
        body: "Adds the official and returns you to the directory. If \u201CMark as active immediately\u201D is ticked, a new Punong Barangay becomes the certificate signatory right away.",
      },
    ],
  },
  {
    id: "officials-edit",
    match: officialEdit,
    label: "Edit Official",
    steps: [
      {
        id: "officials-edit-resident",
        target: '[data-tour="page-officials-edit-resident"]',
        placement: "bottom",
        title: "The linked resident",
        body: "This can't be changed here. To assign the role to someone else, remove this official and add a new one.",
      },
      {
        id: "officials-edit-position",
        target: '[data-tour="page-officials-edit-position"]',
        placement: "top",
        title: "Position and Purok",
        body: "Update the official's position or Purok assignment, for example after a reshuffle of duties.",
      },
      {
        id: "officials-edit-term",
        target: '[data-tour="page-officials-edit-term"]',
        placement: "top",
        title: "Term dates",
        body: "Correct the start date or set a Term End when the term finishes.",
      },
      {
        id: "officials-edit-active",
        target: '[data-tour="page-officials-edit-active"]',
        placement: "top",
        title: "Active or not",
        body: "Untick when the official is no longer serving. They stay in the records but drop out of the default list. An inactive Captain no longer signs certificates.",
      },
      {
        id: "officials-edit-save",
        target: '[data-tour="page-officials-edit-save"]',
        placement: "top",
        title: "Save your changes",
        body: "Save Changes applies the edits and returns you to the directory. Cancel leaves the record as it was.",
      },
    ],
  },
];

export function findPageTour(pathname: string): PageTour | undefined {
  return PAGE_TOURS.find((t) => t.match(pathname));
}