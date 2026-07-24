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
});

export const householdUpdateSchema = householdCreateSchema.partial();

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
  citizenship: z.string().trim().default("Filipino"),
  religion: z.string().trim().optional().nullable(),
  nationality: z.string().trim().default("Filipino"),
  employment_status: z.string().trim().optional().nullable(),
  educational_attainment: z.string().trim().optional().nullable(),
  occupation: z.string().trim().optional().nullable(),
  income_bracket: z.string().trim().optional().nullable(),
  sector: z.enum(["SENIOR", "PWD", "YOUTH", "4PS", "N/A"]).optional().nullable(),
});

export const residentUpdateSchema = residentCreateSchema.partial();

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

// ─── EQUIPMENT ──────────────────────────────────────────────────────────────
export const equipmentStatusEnum = z.enum(["SERVICEABLE", "UNSERVICEABLE", "MISSING"]);

export const equipmentCreateSchema = z.object({
  name: nonEmptyString,
  quantity: z.coerce.number().int().positive().default(1),
  condition: z.string().trim().optional().nullable(),
  status: equipmentStatusEnum.optional(),
  date_acquired: dateString.optional().nullable(),
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

// ─── MEETINGS ───────────────────────────────────────────────────────────────
export const meetingTypeEnum = z.enum(["SB_MEETING", "BARANGAY_ASSEMBLY"]);

export const meetingCreateSchema = z.object({
  meeting_type: meetingTypeEnum,
  meeting_date: dateString,
  minutes: z.string().trim().optional().nullable(),
});

export const meetingUpdateSchema = meetingCreateSchema.partial();

// ─── BARANGAY ID ────────────────────────────────────────────────────────────
export const barangayIdCreateSchema = z.object({
  resident_id: id,
});

// ─── SETTINGS ───────────────────────────────────────────────────────────────
export const settingUpdateSchema = z.object({
  key: nonEmptyString,
  value: z.string(),
});

// ─── SHARED QUERY-STRING HELPERS ────────────────────────────────────────────
// For GET routes: safely parse pagination params instead of raw parseInt().
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});