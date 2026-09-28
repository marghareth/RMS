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

/** Matches /meetings/<numeric id> — a single meeting's detail page (not /meetings/new). */
function meetingDetail(pathname: string) {
  return /^\/meetings\/\d+$/.test(pathname);
}

/** Matches /finance/fund-sources/<numeric id> — one fund source's detail page. */
function fundSourceDetail(pathname: string) {
  return /^\/finance\/fund-sources\/\d+$/.test(pathname);
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

  // ── Assembly (meetings) ────────────────────────────────────────────
  {
    id: "meetings",
    match: exact("/meetings"),
    label: "Assembly",
    steps: [
      {
        id: "meetings-add",
        target: '[data-tour="page-meetings-add"]',
        placement: "left",
        title: "Record a meeting",
        body: "Start a record for a Sangguniang Barangay (SB) meeting or a barangay assembly. You choose the type, date, and place, and can type the minutes now or add them later.",
        hint: "Try it: click to open the new-meeting form.",
      },
      {
        id: "meetings-stats",
        target: '[data-tour="page-meetings-stats"]',
        placement: "bottom",
        title: "Meetings at a glance",
        body: "Counts of SB meetings, barangay assemblies, meetings still scheduled ahead, and everything recorded this year.",
        waitMs: 6000,
      },
      {
        id: "meetings-search",
        target: '[data-tour="page-meetings-search"]',
        placement: "bottom",
        title: "Search the records",
        body: "Type part of a title, the meeting type, a location, or even a phrase from the minutes. The list filters as you type.",
        hint: "Try it: type a location such as “Barangay Hall”.",
      },
      {
        id: "meetings-filter",
        target: '[data-tour="page-meetings-filter"]',
        placement: "left",
        title: "Narrow it down",
        body: "Open the filter panel to limit the list by meeting type, status, location, or a date range. The red number on the button shows how many filters are active.",
      },
      {
        id: "meetings-list",
        target: '[data-tour="page-meetings-list"]',
        placement: "top",
        title: "Open a meeting",
        body: "Newest first. Each row shows the title, type, status, place, how many agenda items it has, and who recorded it. Meetings still ahead are tagged Upcoming.",
        hint: "Try it: click a row to see its details.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "meetings-new",
    match: exact("/meetings/new"),
    label: "New Meeting",
    steps: [
      {
        id: "meetings-new-type",
        target: '[data-tour="page-meetings-new-type"]',
        placement: "bottom",
        title: "Pick the meeting type",
        body: "Choose SB Meeting for a Sangguniang Barangay session, or Barangay Assembly for a community-wide gathering.",
      },
      {
        id: "meetings-new-when",
        target: '[data-tour="page-meetings-new-when"]',
        placement: "top",
        title: "Date and time",
        body: "The date is required. The time is optional; if you leave it blank, it is saved as 12:00 AM.",
      },
      {
        id: "meetings-new-minutes",
        target: '[data-tour="page-meetings-new-minutes"]',
        placement: "top",
        title: "Minutes are optional",
        body: "Type attendance, resolutions, and notes now, or save first and add them after the meeting. To track topics one by one, use agenda items on the meeting page instead.",
      },
      {
        id: "meetings-new-save",
        target: '[data-tour="page-meetings-new-save"]',
        placement: "top",
        title: "Save the record",
        body: "Creates the meeting and opens its page, where you can add agenda items and edit the minutes.",
      },
    ],
  },
  {
    id: "meetings-detail",
    match: meetingDetail,
    label: "Meeting Record",
    steps: [
      {
        id: "meetings-detail-header",
        target: '[data-tour="page-meetings-detail-header"]',
        placement: "bottom",
        title: "Meeting summary",
        body: "The date, type, status, and location, plus who recorded it and when. Use Back to Assembly to return to the list.",
        waitMs: 6000,
      },
      {
        id: "meetings-detail-actions",
        target: '[data-tour="page-meetings-detail-actions"]',
        placement: "left",
        title: "Edit, add, print",
        body: "Edit Meeting changes the title, type, status, date, or location. Add Item creates an agenda item. The printer icon prints the minutes.",
      },
      {
        id: "meetings-detail-agenda",
        target: '[data-tour="page-meetings-detail-agenda"]',
        placement: "top",
        title: "Agenda items",
        body: "Each topic gets its own row so you can track it separately. The counter shows how many items are filled in out of the total.",
        waitMs: 6000,
      },
      {
        id: "meetings-detail-minutes",
        target: '[data-tour="page-meetings-detail-minutes"]',
        placement: "top",
        title: "Minutes",
        body: "Read the minutes here. Click Edit (or Add Minutes if there are none yet), type your changes, then press Save.",
        hint: "Try it: click Edit or Add Minutes.",
        waitMs: 6000,
      },
      {
        id: "meetings-detail-info",
        target: '[data-tour="page-meetings-detail-info"]',
        placement: "left",
        title: "Meeting info",
        body: "A quick reference card with the meeting's date, time, location, and who recorded it.",
        waitMs: 6000,
      },
    ],
  },

  // ── Finance suite ──────────────────────────────────────────────────
  {
    id: "finance-overview",
    match: exact("/finance/overview"),
    label: "Budget Overview",
    steps: [
      {
        id: "finance-overview-stats",
        target: '[data-tour="page-finance-overview-stats"]',
        placement: "bottom",
        title: "The five key numbers",
        body: "Appropriated is the budget you have set. Obligated is spending already committed. Disbursed is what has actually been paid. Revenue is everything collected. Fund Balance is what is left across all fund sources.",
        waitMs: 6000,
      },
      {
        id: "finance-overview-utilization",
        target: '[data-tour="page-finance-overview-utilization"]',
        placement: "bottom",
        title: "How much of each budget is used",
        body: "Each bar compares what has been paid out against what was appropriated for that category: PS (personnel), MOOE (operating expenses), and CO (capital outlay). A nearly full bar means that budget is almost used up.",
        waitMs: 6000,
      },
      {
        id: "finance-overview-revenue",
        target: '[data-tour="page-finance-overview-revenue"]',
        placement: "top",
        title: "Money in vs. money out",
        body: "The last six months side by side. Green bars are revenue collected, red bars are disbursements paid.",
        waitMs: 6000,
      },
      {
        id: "finance-overview-trend",
        target: '[data-tour="page-finance-overview-trend"]',
        placement: "top",
        title: "Fund balance trend",
        body: "Shows whether the combined balance has been growing or shrinking over the last six months.",
        waitMs: 6000,
      },
      {
        id: "finance-overview-breakdown",
        target: '[data-tour="page-finance-overview-breakdown"]',
        placement: "top",
        title: "Where the budget goes",
        body: "The share of the total appropriated budget held by each category.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "finance-appropriations",
    match: exact("/finance/appropriations"),
    label: "Appropriations",
    steps: [
      {
        id: "finance-appropriations-add",
        target: '[data-tour="page-appropriations-add"]',
        placement: "left",
        title: "Add a budget item",
        body: "Opens a short form: the item name, its category (PS, MOOE, or Capital Outlay), the amount, and its status. Click the button again to close the form.",
        hint: "Try it: click to open the form.",
      },
      {
        id: "finance-appropriations-search",
        target: '[data-tour="page-appropriations-search"]',
        placement: "bottom",
        title: "Find an item",
        body: "Type part of an item name and the list filters as you type.",
      },
      {
        id: "finance-appropriations-filters",
        target: '[data-tour="page-appropriations-filters"]',
        placement: "bottom",
        title: "Filter the list",
        body: "This dropdown shows one category at a time (PS, MOOE, or CO). The dropdown next to it filters by status: Pending, Approved, or Completed.",
      },
      {
        id: "finance-appropriations-table",
        target: '[data-tour="page-appropriations-table"]',
        placement: "top",
        title: "Your budget items",
        body: "Each row shows the item, its category, the fund source paying for it, the amount appropriated, how much has been disbursed so far, and its status.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "finance-revenues",
    match: exact("/finance/revenues"),
    label: "Revenue Tracking",
    steps: [
      {
        id: "finance-revenues-add",
        target: '[data-tour="page-revenues-add"]',
        placement: "left",
        title: "Record collected money",
        body: "Opens a form for the source (for example, clearance fees), the amount, the fund source it goes to, and the OR number. Saving it adds the amount to that fund source's balance.",
        hint: "Try it: click to open the form.",
      },
      {
        id: "finance-revenues-stats",
        target: '[data-tour="page-revenues-stats"]',
        placement: "bottom",
        title: "Totals",
        body: "The first card totals whatever the filters below currently show. The second card shows what has been collected so far this month.",
        waitMs: 6000,
      },
      {
        id: "finance-revenues-filters",
        target: '[data-tour="page-revenues-filters"]',
        placement: "bottom",
        title: "Search and filter",
        body: "Search by source or OR number, pick one fund source, or set a From and To date to look at a specific period.",
        hint: "Try it: pick a fund source.",
      },
      {
        id: "finance-revenues-table",
        target: '[data-tour="page-revenues-table"]',
        placement: "top",
        title: "Every collection",
        body: "Each row shows the date, source, fund source, OR number, and amount collected.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "finance-disbursements",
    match: exact("/finance/disbursements"),
    label: "Disbursements",
    steps: [
      {
        id: "finance-disbursements-add",
        target: '[data-tour="page-disbursements-add"]',
        placement: "left",
        title: "Record a payment",
        body: "Opens a form for the payee, amount, purpose, and check or OR numbers. Choose the fund source that pays for it, and optionally the appropriation it counts against. Saving lowers that fund source's balance and adds to the appropriation's disbursed amount.",
        hint: "Try it: click to open the form.",
      },
      {
        id: "finance-disbursements-stats",
        target: '[data-tour="page-disbursements-stats"]',
        placement: "bottom",
        title: "Totals",
        body: "The first card totals whatever the filters below currently show. The second card shows what has been paid out so far this month.",
        waitMs: 6000,
      },
      {
        id: "finance-disbursements-filters",
        target: '[data-tour="page-disbursements-filters"]',
        placement: "bottom",
        title: "Search and filter",
        body: "Search by payee, check number, or OR number. You can also pick one fund source or set a From and To date.",
      },
      {
        id: "finance-disbursements-table",
        target: '[data-tour="page-disbursements-table"]',
        placement: "top",
        title: "Every payment",
        body: "Each row shows the date, payee, the appropriation it was charged to, the fund source it came from, and the amount.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "finance-fund-sources",
    match: exact("/finance/fund-sources"),
    label: "Fund Sources",
    steps: [
      {
        id: "finance-fund-sources-summary",
        target: '[data-tour="page-fund-sources-summary"]',
        placement: "bottom",
        title: "All your funds",
        body: "How many fund sources there are and their combined balance. A fund source is a pot of money the barangay spends from, such as the General Fund.",
        waitMs: 6000,
      },
      {
        id: "finance-fund-sources-add",
        target: '[data-tour="page-fund-sources-add"]',
        placement: "left",
        title: "Add a fund source",
        body: "Opens a form for the name, a code, the starting balance, and any rule that governs it, for example a required percentage for development.",
        hint: "Try it: click to open the form.",
      },
      {
        id: "finance-fund-sources-tabs",
        target: '[data-tour="page-fund-sources-tabs"]',
        placement: "bottom",
        title: "Active or inactive",
        body: "Show all fund sources, or only the active or inactive ones.",
      },
      {
        id: "finance-fund-sources-list",
        target: '[data-tour="page-fund-sources-list"]',
        placement: "top",
        title: "Open a fund source",
        body: "Each row shows the name, status, and current balance. Click one to see its details and transactions.",
        hint: "Try it: click a row.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "finance-fund-source-detail",
    match: fundSourceDetail,
    label: "Fund Source Detail",
    steps: [
      {
        id: "finance-fund-source-detail-back",
        target: '[data-tour="page-fund-source-detail-back"]',
        placement: "bottom",
        title: "Back to the list",
        body: "Returns to the full list of fund sources.",
        waitMs: 6000,
      },
      {
        id: "finance-fund-source-detail-header",
        target: '[data-tour="page-fund-source-detail-header"]',
        placement: "bottom",
        title: "Which fund this is",
        body: "The fund's name, code, and whether it is Active or Inactive. If the fund has a statutory rule, it is shown just below.",
        waitMs: 6000,
      },
      {
        id: "finance-fund-source-detail-stats",
        target: '[data-tour="page-fund-source-detail-stats"]',
        placement: "bottom",
        title: "Balance, money in, money out",
        body: "Current Balance is what is left today, with the starting balance underneath. Total Revenue and Total Disbursed add up everything ever posted to this fund.",
        waitMs: 6000,
      },
      {
        id: "finance-fund-source-detail-history",
        target: '[data-tour="page-fund-source-detail-history"]',
        placement: "top",
        title: "Transaction history",
        body: "Every revenue and disbursement posted against this fund, so you can trace exactly where its balance came from and went.",
        waitMs: 6000,
      },
    ],
  },

  // ── Financial records (simple income/expense ledger) ───────────────
  {
    id: "financial",
    match: exact("/financial"),
    label: "Financial Records",
    steps: [
      {
        id: "financial-add",
        target: '[data-tour="page-financial-add"]',
        placement: "left",
        title: "Add a transaction",
        body: "Record one income or expense entry: what it was for, the amount, and the date.",
        hint: "Try it: click to open the form.",
      },
      {
        id: "financial-summary",
        target: '[data-tour="page-financial-summary"]',
        placement: "left",
        title: "Year-end view",
        body: "Opens the Financial Summary, which breaks income and expenses down month by month for a chosen year.",
      },
      {
        id: "financial-stats",
        target: '[data-tour="page-financial-stats"]',
        placement: "bottom",
        title: "Income, expense, net",
        body: "Totals for whatever the filters currently show. Net Balance is income minus expense, marked Surplus or Deficit.",
        waitMs: 6000,
      },
      {
        id: "financial-search",
        target: '[data-tour="page-financial-search"]',
        placement: "bottom",
        title: "Find a transaction",
        body: "Type part of a description and the list filters as you type.",
      },
      {
        id: "financial-filter",
        target: '[data-tour="page-financial-filter"]',
        placement: "left",
        title: "Filter by type or date",
        body: "Show only income or only expenses, or set a From and To date. The red number shows how many filters are active.",
      },
      {
        id: "financial-table",
        target: '[data-tour="page-financial-table"]',
        placement: "top",
        title: "Your transactions",
        body: "Each row shows the date, description, type, amount, and who recorded it.",
        waitMs: 6000,
      },
    ],
  },
  {
    id: "financial-new",
    match: exact("/financial/new"),
    label: "Add Transaction",
    steps: [
      {
        id: "financial-new-type",
        target: '[data-tour="page-financial-new-type"]',
        placement: "bottom",
        title: "Income or expense",
        body: "Choose Income for money the barangay received, or Expense for money it spent. The category shortcuts change to match.",
      },
      {
        id: "financial-new-category",
        target: '[data-tour="page-financial-new-category"]',
        placement: "bottom",
        title: "Quick categories",
        body: "Tap a common category to fill in the description for you, then edit it if you need to.",
        hint: "Try it: tap a category.",
      },
      {
        id: "financial-new-description",
        target: '[data-tour="page-financial-new-description"]',
        placement: "top",
        title: "Describe it",
        body: "Say what the money was for, for example an honoraria payment and the month it covers.",
      },
      {
        id: "financial-new-amount",
        target: '[data-tour="page-financial-new-amount"]',
        placement: "top",
        title: "Amount and date",
        body: "Enter the amount in pesos and the date the transaction happened, not the date you are encoding it.",
      },
      {
        id: "financial-new-save",
        target: '[data-tour="page-financial-new-save"]',
        placement: "top",
        title: "Save it",
        body: "Adds the entry to the Financial Records list.",
      },
    ],
  },
  {
    id: "financial-summary",
    match: exact("/financial/summary"),
    label: "Financial Summary",
    steps: [
      {
        id: "financial-summary-year",
        target: '[data-tour="page-financial-summary-year"]',
        placement: "bottom",
        title: "Choose a year",
        body: "Switch the whole page to another year that has records.",
      },
      {
        id: "financial-summary-export",
        target: '[data-tour="page-financial-summary-export"]',
        placement: "left",
        title: "Print the report",
        body: "Opens your browser's print dialog so you can print the summary or save it as a PDF.",
      },
      {
        id: "financial-summary-stats",
        target: '[data-tour="page-financial-summary-stats"]',
        placement: "bottom",
        title: "Year totals",
        body: "Total income, total expense, and the net balance for the selected year.",
        waitMs: 6000,
      },
      {
        id: "financial-summary-chart",
        target: '[data-tour="page-financial-summary-chart"]',
        placement: "top",
        title: "Month by month",
        body: "Green bars are income and red bars are expenses, so months where spending outran income stand out at a glance.",
        waitMs: 6000,
      },
      {
        id: "financial-summary-table",
        target: '[data-tour="page-financial-summary-table"]',
        placement: "top",
        title: "The numbers behind the chart",
        body: "The same figures as a table, one row per month, handy for reports.",
        waitMs: 6000,
      },
    ],
  },
];

export function findPageTour(pathname: string): PageTour | undefined {
  return PAGE_TOURS.find((t) => t.match(pathname));
}