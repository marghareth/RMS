// FILE: src/lib/residentImportColumns.ts
//
// The import template's column list, on its own so BOTH the server
// (residentImport.ts, which pulls in the xlsx/papaparse parsers) and the
// browser (the import page's error-report download) can use it without the
// client bundle dragging in a spreadsheet library.

// The columns a barangay's field census spreadsheet is expected to have.
// Kept intentionally smaller than the full Resident model (which has 40+
// fields) — this covers what's actually collected on a typical door-to-door
// RBI form. Anything not listed here can still be filled in later through
// the normal Edit Resident form.
export const RESIDENT_IMPORT_COLUMNS = [
  { key: "fname", label: "First Name", required: true },
  { key: "lname", label: "Last Name", required: true },
  { key: "mname", label: "Middle Name", required: false },
  { key: "name_extension", label: "Suffix (Jr., Sr., III)", required: false },
  { key: "birthdate", label: "Birthdate (YYYY-MM-DD)", required: true },
  { key: "sex", label: "Sex (MALE/FEMALE)", required: true },
  { key: "civil_status", label: "Civil Status (SINGLE/MARRIED/WIDOWED/SEPARATED/LIVE_IN)", required: true },
  { key: "purok_name", label: "Purok", required: false },
  { key: "household_no", label: "Household No.", required: false },
  { key: "place_of_birth", label: "Place of Birth", required: false },
  { key: "religion", label: "Religion", required: false },
  { key: "employment_status", label: "Employment Status", required: false },
  { key: "educational_attainment", label: "Educational Attainment", required: false },
  { key: "occupation", label: "Occupation", required: false },
  { key: "income_bracket", label: "Income Bracket", required: false },
  { key: "mobile", label: "Mobile No.", required: false },
  { key: "email", label: "Email", required: false },
] as const;