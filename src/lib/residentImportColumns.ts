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
//
// key      what the file may use as the heading, and the internal field name
// label    older, longer heading (still accepted when importing)
// header   the heading the Excel template and the export use
// hint     what to enter, shown on the template's Instructions sheet
// example  a sample value for the Instructions sheet
// width    column width in the template and the export
export const RESIDENT_IMPORT_COLUMNS = [
  { key: "fname", label: "First Name", header: "First Name", required: true, width: 18, hint: "Given name.", example: "Juan" },
  { key: "lname", label: "Last Name", header: "Last Name", required: true, width: 18, hint: "Surname.", example: "Dela Cruz" },
  { key: "mname", label: "Middle Name", header: "Middle Name", required: false, width: 16, hint: "Full middle name, not just the initial.", example: "Santos" },
  { key: "name_extension", label: "Suffix (Jr., Sr., III)", header: "Suffix", required: false, width: 9, hint: "Jr., Sr., II, III and so on. Leave blank if none.", example: "Jr." },
  { key: "birthdate", label: "Birthdate (YYYY-MM-DD)", header: "Birthdate", required: true, width: 13, hint: "Any normal date works: 1990-03-15, 03/15/1990 or March 15, 1990.", example: "1990-03-15" },
  { key: "sex", label: "Sex (MALE/FEMALE)", header: "Sex", required: true, width: 10, hint: "Male or Female (pick from the list).", example: "Male" },
  { key: "civil_status", label: "Civil Status (SINGLE/MARRIED/WIDOWED/SEPARATED/LIVE_IN)", header: "Civil Status", required: true, width: 15, hint: "Single, Married, Widowed, Separated or Live-in (pick from the list).", example: "Married" },
  { key: "purok_name", label: "Purok", header: "Purok", required: false, width: 16, hint: "Must be a purok already set up in the system (pick from the list).", example: "Purok 1" },
  { key: "household_no", label: "Household No.", header: "Household No.", required: false, width: 15, hint: "Must be a household already registered. Its purok is used if they differ.", example: "HH-0001" },
  { key: "place_of_birth", label: "Place of Birth", header: "Place of Birth", required: false, width: 18, hint: "Town or city.", example: "Tacloban City" },
  { key: "religion", label: "Religion", header: "Religion", required: false, width: 15, hint: "As the person gives it.", example: "Roman Catholic" },
  { key: "employment_status", label: "Employment Status", header: "Employment Status", required: false, width: 20, hint: "For example Employed, Unemployed, Self-employed, Student, Retired.", example: "Employed" },
  { key: "educational_attainment", label: "Educational Attainment", header: "Education", required: false, width: 18, hint: "Highest level finished.", example: "College Graduate" },
  { key: "occupation", label: "Occupation", header: "Occupation", required: false, width: 16, hint: "Current work, if any.", example: "Farmer" },
  { key: "income_bracket", label: "Income Bracket", header: "Monthly Income", required: false, width: 17, hint: "Monthly household income range.", example: "10,000 - 20,000" },
  { key: "mobile", label: "Mobile No.", header: "Mobile No.", required: false, width: 14, hint: "PH mobile number, 11 digits starting with 09.", example: "09171234567" },
  { key: "email", label: "Email", header: "Email", required: false, width: 24, hint: "If they have one.", example: "juan@example.com" },
] as const;