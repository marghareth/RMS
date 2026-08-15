// FILE: src/lib/validations.ts
//
// Centralized Zod schemas for every API resource. One schema per
// create/update operation, mirroring prisma/schema.prisma field-for-field.
//
// Usage in a route:
//   const body = residentCreateSchema.parse(await req.json());
// Throws a ZodError on failure, caught by withErrorHandling() in api-handler.ts.

import { z } from "zod";

// ─── SHARED PRIMITIVES ─────────────────────────────────────────────────────
const id = z.coerce.number().int().positive();
const optionalId = z.coerce.number().int().positive().nullable().optional();
const nonEmptyString = z.string().trim().min(1, "Required");
const dateString = z.coerce.date();

// ─── USERS ──────────────────────────────────────────────────────────────────
export const roleEnum = z.enum(["ADMIN", "CAPTAIN", "SECRETARY", "KAGAWAD", "BHW", "ENCODER"]);

export const userCreateSchema = z.object({
  username: nonEmptyString.max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum,
  is_active: z.boolean().optional(),
});

export const userUpdateSchema = userCreateSchema.partial().extend({
  password: z.string().min(8).optional(), // don't force a password change on update
});

// ─── HOUSEHOLDS ─────────────────────────────────────────────────────────────
export const householdCreateSchema = z.object({
  purok_id: id,
  household_head_id: optionalId,
  address: nonEmptyString,
  housing_type: z.enum(["OWN", "RENT", "SHARED", "INFORMAL"]).optional().nullable(),
  water_source: z.enum(["INDIVIDUAL", "COMMUNAL", "WELL", "OTHER"]).optional().nullable(),
  comfort_room: z.enum(["OWN", "SHARED", "NONE"]).optional().nullable(),

  // ── DILG/BIMS National Indicators + classification (2.8) ──
  tenure_status: z.string().trim().optional().nullable(),
  tenure_other: z.string().trim().optional().nullable(),
  housing_type_other: z.string().trim().optional().nullable(),
  household_unit: z.string().trim().optional().nullable(),
  household_unit_other: z.string().trim().optional().nullable(),
  no_of_families: z.coerce.number().int().positive().optional().nullable(),
  monthly_income: z.coerce.number().nonnegative().optional().nullable(),
  waste_disposal: z.string().trim().optional().nullable(),
  power_supply: z.string().trim().optional().nullable(),
});

export const householdUpdateSchema = householdCreateSchema.partial();

// ── Migrants (2.8) ──
export const migrantCreateSchema = z.object({
  household_id: id,
  name: nonEmptyString,
  previous_location: z.string().trim().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
  transferred_to: z.string().trim().optional().nullable(),
  duration_here: z.string().trim().optional().nullable(),
  has_returned: z.boolean().optional(),
});

export const migrantUpdateSchema = migrantCreateSchema.partial().omit({ household_id: true });

// ─── RESIDENTS ──────────────────────────────────────────────────────────────
export const civilStatusEnum = z.enum(["SINGLE", "MARRIED", "WIDOWED", "SEPARATED", "LIVE_IN"]);
export const sexEnum = z.enum(["MALE", "FEMALE"]);

export const residentCreateSchema = z.object({
  household_id: optionalId,
  purok_id: optionalId,
  fname: nonEmptyString.max(100),
  lname: nonEmptyString.max(100),
  mname: z.string().trim().max(100).optional().nullable(),
  name_extension: z.string().trim().max(20).optional().nullable(),
  birthdate: dateString,
  place_of_birth: z.string().trim().optional().nullable(),
  sex: sexEnum,
  civil_status: civilStatusEnum,
  citizenship: z.string().trim().optional(), // DB column defaults to "Filipino" when omitted on create
  religion: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional(), // DB column defaults to "Filipino" when omitted on create
  employment_status: z.string().trim().optional().nullable(),
  educational_attainment: z.string().trim().optional().nullable(),
  occupation: z.string().trim().optional().nullable(),
  income_bracket: z.string().trim().optional().nullable(),
  sector: z.enum(["SENIOR", "PWD", "YOUTH", "4PS", "N/A"]).optional().nullable(),

  // ── Contact (2.9) ──
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  mobile: z.string().trim().optional().nullable(),
  tel_no: z.string().trim().optional().nullable(),

  // ── Granular address (2.9) ──
  house_block_lot_no: z.string().trim().optional().nullable(),
  street: z.string().trim().optional().nullable(),
  subdivision_village: z.string().trim().optional().nullable(),
  barangay: z.string().trim().optional().nullable(),
  city_municipality: z.string().trim().optional().nullable(),
  province: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  zip_code: z.string().trim().optional().nullable(),

  // ── Identity (2.9) ──
  philsys_card_no: z.string().trim().optional().nullable(),
  gender: z.string().trim().optional().nullable(),
  residence_of_mother_upon_birth: z.string().trim().optional().nullable(),
  type_of_resident: z.string().trim().optional().nullable(),
  mothers_maiden_name: z.string().trim().optional().nullable(),
  ethnicity: z.string().trim().optional().nullable(),
  blood_type: z.string().trim().optional().nullable(),
  height_m: z.coerce.number().positive().optional().nullable(),
  weight_kg: z.coerce.number().positive().optional().nullable(),
  complexion: z.string().trim().optional().nullable(),

  // ── Voter info (2.9) ──
  is_registered_voter: z.boolean().optional(),
  is_resident_voter: z.boolean().optional(),
  last_voted_year: z.coerce.number().int().optional().nullable(),
});

export const residentUpdateSchema = residentCreateSchema.partial();

// ── Sectoral affiliations (2.9) — multi-value replacement for `sector` ──
export const sectorTypeEnum = z.enum([
  "SENIOR", "PWD", "YOUTH", "SOLO_PARENT", "4PS", "SOLO_BREADWINNER", "INDIGENOUS", "OTHER",
]);

export const residentSectorCreateSchema = z.object({
  resident_id: id,
  sector_type: sectorTypeEnum,
});

// ── Government assistance programs (2.9) — replaces `is_4ps_beneficiary` ──
export const governmentAssistanceCreateSchema = z.object({
  resident_id: id,
  program_name: nonEmptyString,
  date_enrolled: dateString.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const governmentAssistanceUpdateSchema = governmentAssistanceCreateSchema.partial().omit({ resident_id: true });

// ─── CERTIFICATES ───────────────────────────────────────────────────────────
export const certificateTypeEnum = z.enum([
  "RESIDENCY", "INDIGENCY", "CLEARANCE", "GOOD_MORAL", "BUSINESS_PERMIT",
  "COHABITATION", "SOLO_PARENT", "FIRST_TIME_JOB_SEEKER", "LATE_REGISTRATION",
]);

export const certificateCreateSchema = z.object({
  resident_id: optionalId,
  certificate_type: certificateTypeEnum,
  purpose: nonEmptyString,
  flagged_manual: z.boolean().optional(),
  manual_name: z.string().trim().optional().nullable(),
  manual_address: z.string().trim().optional().nullable(),
}).refine(
  (data) => data.resident_id || (data.manual_name && data.manual_address),
  { message: "Either resident_id or manual_name + manual_address must be provided." }
);

// ── Document Request Workflow (2.7) ──
export const paymentStatusEnum = z.enum(["PENDING", "PAID", "WAIVED"]);
export const requestStatusEnum = z.enum(["PENDING", "PROCESSING", "RELEASED", "CANCELLED"]);

export const certificateProcessSchema = z.object({
  status: requestStatusEnum,
});

export const certificatePaymentSchema = z.object({
  payment_status: paymentStatusEnum,
});

export const certificateTemplateUpdateSchema = z.object({
  title: nonEmptyString,
  body: nonEmptyString,
  closing_line: z.string().trim().optional().nullable(),
});

// ─── BLOTTER ────────────────────────────────────────────────────────────────
export const blotterStatusEnum = z.enum(["FILED", "ONGOING", "RESOLVED", "DISMISSED"]);

export const blotterCreateSchema = z.object({
  complainant_id: optionalId,
  complainant_name: nonEmptyString,
  complainant_contact: z.string().trim().optional().nullable(),
  complainant_address: z.string().trim().optional().nullable(),
  respondent_id: optionalId,
  respondent_name: nonEmptyString,
  incident_narrative: nonEmptyString,
  incident_date: dateString,
  incident_type: nonEmptyString,
  hearing_date: dateString.optional().nullable(),
});

export const blotterUpdateSchema = blotterCreateSchema.partial().extend({
  status: blotterStatusEnum.optional(),
  escalated: z.boolean().optional(),
});

export const blotterUpdateEntrySchema = z.object({
  notes: nonEmptyString,
  new_status: blotterStatusEnum.optional().nullable(),
});

// ─── OFFICIALS ──────────────────────────────────────────────────────────────
export const officialCreateSchema = z.object({
  resident_id: id,
  position: nonEmptyString,
  contact_no: z.string().trim().optional().nullable(),
  photo_url: z.string().trim().url().optional().nullable(),
  purok_assignment: z.string().trim().optional().nullable(),
  term_start: dateString,
  term_end: dateString.optional().nullable(),
  is_active: z.boolean().optional(),
});

export const officialUpdateSchema = officialCreateSchema.partial();

// ─── SPECIAL REGISTRIES ─────────────────────────────────────────────────────
export const registryTypeEnum = z.enum(["SENIOR_CITIZEN", "PWD", "FOUR_PS"]);

export const registryCreateSchema = z.object({
  resident_id: id,
  registry_type: registryTypeEnum,
  disability_type: z.string().trim().optional().nullable(),
  is_4ps_beneficiary: z.boolean().optional(),
});

export const registryUpdateSchema = registryCreateSchema.partial();

// ─── HEALTH RECORDS ─────────────────────────────────────────────────────────
export const healthRecordCreateSchema = z.object({
  resident_id: id,
  record_type: nonEmptyString,
  notes: z.string().trim().optional().nullable(),
});

export const healthRecordUpdateSchema = healthRecordCreateSchema.partial();

export const vaccinationCreateSchema = z.object({
  resident_id: id,
  vaccine_name: nonEmptyString,
  date_given: dateString,
});

// ─── FINANCIAL RECORDS ──────────────────────────────────────────────────────
export const financialTypeEnum = z.enum(["INCOME", "EXPENSE"]);

export const financialCreateSchema = z.object({
  transaction_type: financialTypeEnum,
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: nonEmptyString,
  transaction_date: dateString,
});

// ─── EQUIPMENT / ASSETS (2.5) ────────────────────────────────────────────────
export const equipmentStatusEnum = z.enum(["SERVICEABLE", "UNSERVICEABLE", "MISSING"]);
// Must match the AssetCondition enum in schema.prisma exactly, and the
// display-layer label lookup in the Assets UI — a mismatch here silently
// renders the condition field blank instead of erroring.
export const assetConditionEnum = z.enum(["GOOD", "FAIR", "POOR", "NEEDS_REPAIR", "DECOMMISSIONED"]);

export const equipmentCreateSchema = z.object({
  name: nonEmptyString,
  quantity: z.coerce.number().int().positive().default(1),
  condition: assetConditionEnum.optional().nullable(),
  status: equipmentStatusEnum.optional(),
  date_acquired: dateString.optional().nullable(),
  image_url: z.string().trim().optional().nullable(),
  serial_number: z.string().trim().optional().nullable(),
  purchase_cost: z.coerce.number().nonnegative().optional().nullable(),
  current_value: z.coerce.number().nonnegative().optional().nullable(),
  purchase_date: dateString.optional().nullable(),
  assigned_to: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  asset_type: z.string().trim().optional().nullable(),
});

export const equipmentUpdateSchema = equipmentCreateSchema.partial();

export const equipmentBorrowCreateSchema = z.object({
  equipment_id: id,
  resident_id: optionalId,
  borrower_name: nonEmptyString,
  date_borrowed: dateString,
  expected_return: dateString,
});

export const equipmentReturnSchema = z.object({
  actual_return: dateString,
  return_condition: z.string().trim().optional().nullable(),
});

// ─── MEETINGS + AGENDA ITEMS (2.4) ───────────────────────────────────────────
export const meetingTypeEnum = z.enum(["SB_MEETING", "BARANGAY_ASSEMBLY"]);
export const meetingStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]);

export const meetingCreateSchema = z.object({
  meeting_type: meetingTypeEnum,
  meeting_date: dateString,
  minutes: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  status: meetingStatusEnum.optional(),
});

export const meetingUpdateSchema = meetingCreateSchema.partial();

export const agendaItemStatusEnum = z.enum(["PENDING", "DISCUSSED", "APPROVED"]);

export const agendaItemCreateSchema = z.object({
  meeting_id: id,
  title: nonEmptyString,
  description: z.string().trim().optional().nullable(),
  sort_order: z.coerce.number().int().optional().default(0),
  status: agendaItemStatusEnum.optional(),
  minutes: z.string().trim().optional().nullable(),
});

export const agendaItemUpdateSchema = agendaItemCreateSchema.partial().omit({ meeting_id: true });

// ─── BARANGAY ID ────────────────────────────────────────────────────────────
export const barangayIdCreateSchema = z.object({
  resident_id: id,
});

// ─── SETTINGS ───────────────────────────────────────────────────────────────
export const settingUpdateSchema = z.object({
  key: nonEmptyString,
  value: z.string(),
});

// ─── PUROKS ─────────────────────────────────────────────────────────────────
export const purokCreateSchema = z.object({
  name: nonEmptyString,
});

export const purokUpdateSchema = z.object({
  name: nonEmptyString,
});

// ─── VISITOR LOG (2.1) ────────────────────────────────────────────────────
export const visitorLogCreateSchema = z.object({
  visitor_name: nonEmptyString,
  contact: z.string().trim().optional().nullable(),
  purpose: nonEmptyString,
  person_to_visit: z.string().trim().optional().nullable(),
});

export const visitorLogUpdateSchema = visitorLogCreateSchema.partial();

// ─── DECEASED RECORDS (2.2) ───────────────────────────────────────────────
export const deceasedRecordCreateSchema = z.object({
  resident_id: id,
  date_of_death: dateString,
  immediate_cause: nonEmptyString,
  underlying_cause: z.string().trim().optional().nullable(),
});

export const deceasedRecordUpdateSchema = deceasedRecordCreateSchema.partial().omit({ resident_id: true });

// ─── CALENDAR (2.3) ────────────────────────────────────────────────────────
export const calendarEventCreateSchema = z.object({
  title: nonEmptyString,
  description: z.string().trim().optional().nullable(),
  event_date: dateString,
  event_type: z.string().trim().optional().nullable(),
  meeting_id: optionalId,
});

export const calendarEventUpdateSchema = calendarEventCreateSchema.partial();

// ─── BLOTTER INCIDENT TYPES (2.10 / 2.11) ─────────────────────────────────
export const incidentTypeCreateSchema = z.object({
  name: nonEmptyString,
});

export const incidentTypeUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  is_active: z.boolean().optional(),
});

// ─── FINANCE SUITE (2.6) ───────────────────────────────────────────────────
export const fundSourceStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const fundSourceCreateSchema = z.object({
  name: nonEmptyString,
  code: z.string().trim().optional().nullable(),
  statutory_rule: z.string().trim().optional().nullable(),
  status: fundSourceStatusEnum.optional(),
  original_balance: z.coerce.number().nonnegative().optional().nullable(),
  current_balance: z.coerce.number().nonnegative().optional().default(0),
});

export const fundSourceUpdateSchema = fundSourceCreateSchema.partial();

export const appropriationCategoryEnum = z.enum(["PS", "MOOE", "CO"]);
export const appropriationStatusEnum = z.enum(["PENDING", "APPROVED", "COMPLETED"]);

export const appropriationCreateSchema = z.object({
  item_name: nonEmptyString,
  category: appropriationCategoryEnum,
  appropriated_amount: z.coerce.number().nonnegative("Amount must be 0 or greater").default(0),
  obligated_amount: z.coerce.number().nonnegative().optional().default(0),
  disbursed_amount: z.coerce.number().nonnegative().optional().default(0),
  payee: z.string().trim().optional().nullable(),
  status: appropriationStatusEnum.optional(),
  fund_source_id: optionalId,
});

export const appropriationUpdateSchema = appropriationCreateSchema.partial();

export const revenueCreateSchema = z.object({
  // Never nullable/undefined at rest — defaults to 0 so the UI never has to
  // render NaN/₱NaN when a revenue amount is somehow missing.
  amount: z.coerce.number().nonnegative("Amount must be 0 or greater").default(0),
  date: dateString,
  source: nonEmptyString,
  category: z.string().trim().optional().nullable(),
  income_account: z.string().trim().optional().nullable(),
  coa_code: z.string().trim().optional().nullable(),
  fund_source_id: optionalId,
  or_number: z.string().trim().optional().nullable(),
});

export const revenueUpdateSchema = revenueCreateSchema.partial();

export const disbursementCreateSchema = z.object({
  amount: z.coerce.number().nonnegative("Amount must be 0 or greater").default(0),
  date: dateString,
  payee: nonEmptyString,
  particular: z.string().trim().optional().nullable(),
  check_number: z.string().trim().optional().nullable(),
  or_number: z.string().trim().optional().nullable(),
  appropriation_id: optionalId,
  item: z.string().trim().optional().nullable(),
  fund_source_id: optionalId,
});

export const disbursementUpdateSchema = disbursementCreateSchema.partial();

// ─── DASHBOARD CUSTOMIZATION (2.12) ────────────────────────────────────────
// ─── AI FEATURES ────────────────────────────────────────────────────────────
export const aiCertificatePurposeSchema = z.object({
  certificate_type: z.enum([
    "RESIDENCY", "INDIGENCY", "CLEARANCE", "GOOD_MORAL", "BUSINESS_PERMIT",
    "COHABITATION", "SOLO_PARENT", "FIRST_TIME_JOB_SEEKER", "LATE_REGISTRATION",
  ]),
  note: z.string().trim().min(1, "Describe what this certificate is for").max(300),
});

export const aiMeetingMinutesSchema = z.object({
  notes: z.string().trim().min(1, "Add some raw notes to draft from").max(4000),
});

export const bulkReleaseCertificatesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "Select at least one certificate").max(100),
});

export const meetingDuplicateSchema = z.object({
  meeting_date: dateString,
});

export const residentImportCommitSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, "No rows to import")
    .max(500, "At most 500 rows per import"),
});

export const dashboardWidgetKeyEnum = z.enum([
  "kpi_residents", "kpi_document_requests", "kpi_blotter_cases", "kpi_visitors",
  "kpi_meetings_today", "kpi_assets", "kpi_settled_cases",
  "quick_actions", "priority_tasks", "activity_feed", "document_status_chart", "ai_briefing",
]);

export const dashboardPreferenceUpdateSchema = z.object({
  preferences: z.array(
    z.object({
      widget_key: dashboardWidgetKeyEnum,
      is_enabled: z.boolean(),
    })
  ),
});

// ─── SHARED QUERY-STRING HELPERS ────────────────────────────────────────────
// For GET routes: safely parse pagination params instead of raw parseInt().
// URLSearchParams.get() returns `null` for an absent param, but Zod's
// .default() only triggers on `undefined` — without the preprocess below,
// an absent `?page=`/`?limit=` would coerce null -> 0 and fail .positive(),
// throwing a 400 on every list request that doesn't explicitly set them.
const nullToUndefined = (v: unknown) => (v === null ? undefined : v);

export const paginationSchema = z.object({
  page: z.preprocess(nullToUndefined, z.coerce.number().int().positive().default(1)),
  limit: z.preprocess(nullToUndefined, z.coerce.number().int().positive().max(100).default(20)),
});