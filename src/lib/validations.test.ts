// FILE: src/lib/validations.test.ts
import { describe, it, expect } from 'vitest';
import {
  userCreateSchema,
  residentCreateSchema,
  certificateCreateSchema,
  blotterCreateSchema,
  fundSourceCreateSchema,
  appropriationCreateSchema,
  revenueCreateSchema,
  disbursementCreateSchema,
  fundSourceUpdateSchema,
  appropriationUpdateSchema,
  revenueUpdateSchema,
  disbursementUpdateSchema,
  equipmentUpdateSchema,
  agendaItemUpdateSchema,
  bulkReleaseCertificatesSchema,
  residentImportCommitSchema,
  dashboardPreferenceUpdateSchema,
  paginationSchema,
} from './validations';

describe('userCreateSchema', () => {
  it('accepts a valid user', () => {
    const result = userCreateSchema.safeParse({ username: 'jdelacruz', password: 'longenough1', role: 'ENCODER' });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = userCreateSchema.safeParse({ username: 'jdelacruz', password: 'short', role: 'ENCODER' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid role', () => {
    const result = userCreateSchema.safeParse({ username: 'jdelacruz', password: 'longenough1', role: 'SUPERADMIN' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty username', () => {
    const result = userCreateSchema.safeParse({ username: '  ', password: 'longenough1', role: 'ENCODER' });
    expect(result.success).toBe(false);
  });
});

describe('residentCreateSchema', () => {
  const base = {
    fname: 'Juan',
    lname: 'Dela Cruz',
    birthdate: '1990-01-15',
    sex: 'MALE',
    civil_status: 'SINGLE',
  };

  it('accepts a minimal valid resident', () => {
    expect(residentCreateSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a missing first name', () => {
    const result = residentCreateSchema.safeParse({ ...base, fname: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid sex value', () => {
    const result = residentCreateSchema.safeParse({ ...base, sex: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid civil status', () => {
    const result = residentCreateSchema.safeParse({ ...base, civil_status: 'ENGAGED' });
    expect(result.success).toBe(false);
  });

  it('allows an empty-string email (treated as "no email")', () => {
    const result = residentCreateSchema.safeParse({ ...base, email: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed non-empty email', () => {
    const result = residentCreateSchema.safeParse({ ...base, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a name over the max length', () => {
    const result = residentCreateSchema.safeParse({ ...base, fname: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('certificateCreateSchema', () => {
  it('accepts a request tied to an existing resident', () => {
    const result = certificateCreateSchema.safeParse({
      resident_id: 5,
      certificate_type: 'RESIDENCY',
      purpose: 'Employment',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a walk-in request with manual name + address instead of resident_id', () => {
    const result = certificateCreateSchema.safeParse({
      certificate_type: 'INDIGENCY',
      purpose: 'Medical assistance',
      manual_name: 'Maria Santos',
      manual_address: '123 Rizal St.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a request with neither resident_id nor manual name/address', () => {
    const result = certificateCreateSchema.safeParse({
      certificate_type: 'CLEARANCE',
      purpose: 'Travel',
    });
    expect(result.success).toBe(false);
  });

  it('rejects manual_name without manual_address', () => {
    const result = certificateCreateSchema.safeParse({
      certificate_type: 'CLEARANCE',
      purpose: 'Travel',
      manual_name: 'Maria Santos',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown certificate_type', () => {
    const result = certificateCreateSchema.safeParse({
      resident_id: 1,
      certificate_type: 'TRAVEL_PERMIT',
      purpose: 'Travel',
    });
    expect(result.success).toBe(false);
  });
});

describe('blotterCreateSchema', () => {
  const base = {
    complainant_name: 'Juan Dela Cruz',
    respondent_name: 'Pedro Reyes',
    incident_narrative: 'A dispute over a fence boundary.',
    incident_date: '2026-05-01',
    incident_type: 'Property Dispute',
  };

  it('accepts a valid blotter case', () => {
    expect(blotterCreateSchema.safeParse(base).success).toBe(true);
  });

  it('requires a non-empty incident narrative', () => {
    const result = blotterCreateSchema.safeParse({ ...base, incident_narrative: '' });
    expect(result.success).toBe(false);
  });

  it('requires an incident date', () => {
    const { incident_date, ...withoutDate } = base;
    const result = blotterCreateSchema.safeParse(withoutDate);
    expect(result.success).toBe(false);
  });
});

describe('finance schemas', () => {
  it('fundSourceCreateSchema defaults current_balance to 0 when omitted', () => {
    const result = fundSourceCreateSchema.safeParse({ name: '20% Development Fund' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.current_balance).toBe(0);
  });

  it('fundSourceCreateSchema rejects a negative current_balance', () => {
    const result = fundSourceCreateSchema.safeParse({ name: 'General Fund', current_balance: -100 });
    expect(result.success).toBe(false);
  });

  it('appropriationCreateSchema requires a valid category and defaults amounts to 0', () => {
    const result = appropriationCreateSchema.safeParse({ item_name: 'Office Supplies', category: 'MOOE' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appropriated_amount).toBe(0);
      expect(result.data.obligated_amount).toBe(0);
      expect(result.data.disbursed_amount).toBe(0);
    }
  });

  it('appropriationCreateSchema rejects a negative appropriated_amount', () => {
    const result = appropriationCreateSchema.safeParse({
      item_name: 'Office Supplies',
      category: 'MOOE',
      appropriated_amount: -50,
    });
    expect(result.success).toBe(false);
  });

  it('revenueCreateSchema requires a source and a date', () => {
    const ok = revenueCreateSchema.safeParse({ date: '2026-01-01', source: 'Real Property Tax' });
    expect(ok.success).toBe(true);

    const missingSource = revenueCreateSchema.safeParse({ date: '2026-01-01', source: '' });
    expect(missingSource.success).toBe(false);
  });

  it('disbursementCreateSchema requires a payee and a date, coerces amount', () => {
    const result = disbursementCreateSchema.safeParse({
      date: '2026-01-01',
      payee: 'ABC Supplies Co.',
      amount: '1500.50',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(1500.5);
  });
});

describe('update schemas do not silently zero-fill defaulted amount fields', () => {
  // Regression coverage for a real bug: `<createSchema>.partial()` alone
  // does NOT make an omitted `.default(0)` field parse to `undefined` —
  // Zod still applies the default. The PATCH routes for these resources
  // rely on `body.amount ?? existing.amount` / `"field" in body` to tell
  // "omitted" apart from "explicitly set to 0", so a defaulted field
  // silently reappearing as 0 corrupts fund-source balances and
  // appropriation budgets on any partial edit that doesn't resend it.
  // See fundSourceUpdateSchema/appropriationUpdateSchema/
  // revenueUpdateSchema/disbursementUpdateSchema in validations.ts for
  // the fix (each amount field is re-declared without `.default()`).

  it('revenueUpdateSchema leaves amount undefined when omitted', () => {
    const result = revenueUpdateSchema.parse({ source: 'Renamed source' });
    expect(result.amount).toBeUndefined();
    expect('amount' in result).toBe(false);
  });

  it('disbursementUpdateSchema leaves amount undefined when omitted', () => {
    const result = disbursementUpdateSchema.parse({ payee: 'Renamed payee' });
    expect(result.amount).toBeUndefined();
  });

  it('appropriationUpdateSchema leaves appropriated_amount/obligated_amount/disbursed_amount undefined when omitted', () => {
    const result = appropriationUpdateSchema.parse({ item_name: 'Renamed item' });
    expect(result.appropriated_amount).toBeUndefined();
    expect(result.obligated_amount).toBeUndefined();
    expect(result.disbursed_amount).toBeUndefined();
  });

  it('fundSourceUpdateSchema leaves original_balance/current_balance undefined when omitted', () => {
    const result = fundSourceUpdateSchema.parse({ name: 'Renamed fund' });
    expect(result.original_balance).toBeUndefined();
    expect(result.current_balance).toBeUndefined();
  });

  it('still validates and coerces the amount when it IS explicitly provided', () => {
    const result = revenueUpdateSchema.parse({ amount: '250.50' });
    expect(result.amount).toBe(250.5);
  });

  it('still rejects a negative amount when explicitly provided', () => {
    expect(revenueUpdateSchema.safeParse({ amount: -1 }).success).toBe(false);
    expect(appropriationUpdateSchema.safeParse({ appropriated_amount: -1 }).success).toBe(false);
  });

  it('equipmentUpdateSchema leaves quantity undefined when omitted, but still validates it when given', () => {
    const result = equipmentUpdateSchema.parse({ name: 'Renamed equipment' });
    expect(result.quantity).toBeUndefined();
    expect(equipmentUpdateSchema.safeParse({ quantity: 0 }).success).toBe(false); // must stay positive
    expect(equipmentUpdateSchema.parse({ quantity: 5 }).quantity).toBe(5);
  });

  it('agendaItemUpdateSchema leaves sort_order undefined when omitted, but still validates it when given', () => {
    const result = agendaItemUpdateSchema.parse({ title: 'Renamed agenda item' });
    expect(result.sort_order).toBeUndefined();
    expect(agendaItemUpdateSchema.parse({ sort_order: 3 }).sort_order).toBe(3);
  });
});

describe('bulkReleaseCertificatesSchema', () => {
  it('requires at least one id', () => {
    expect(bulkReleaseCertificatesSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it('accepts a normal batch', () => {
    expect(bulkReleaseCertificatesSchema.safeParse({ ids: [1, 2, 3] }).success).toBe(true);
  });

  it('rejects more than 100 ids', () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    expect(bulkReleaseCertificatesSchema.safeParse({ ids }).success).toBe(false);
  });

  it('accepts exactly 100 ids', () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(bulkReleaseCertificatesSchema.safeParse({ ids }).success).toBe(true);
  });
});

describe('residentImportCommitSchema', () => {
  it('rejects an empty rows array', () => {
    expect(residentImportCommitSchema.safeParse({ rows: [] }).success).toBe(false);
  });

  it('accepts a reasonable batch of rows', () => {
    const rows = [{ fname: 'Juan' }, { fname: 'Maria' }];
    expect(residentImportCommitSchema.safeParse({ rows }).success).toBe(true);
  });

  it('rejects more than 500 rows', () => {
    const rows = Array.from({ length: 501 }, () => ({ fname: 'Juan' }));
    expect(residentImportCommitSchema.safeParse({ rows }).success).toBe(false);
  });
});

describe('dashboardPreferenceUpdateSchema', () => {
  it('accepts a valid list of widget preferences', () => {
    const result = dashboardPreferenceUpdateSchema.safeParse({
      preferences: [
        { widget_key: 'kpi_residents', is_enabled: true },
        { widget_key: 'ai_briefing', is_enabled: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown widget key', () => {
    const result = dashboardPreferenceUpdateSchema.safeParse({
      preferences: [{ widget_key: 'kpi_made_up_widget', is_enabled: true }],
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('defaults page to 1 and limit to 20 when both are null (absent query params)', () => {
    const result = paginationSchema.safeParse({ page: null, limit: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string query params to numbers', () => {
    const result = paginationSchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects a limit above 100', () => {
    const result = paginationSchema.safeParse({ page: '1', limit: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive page', () => {
    const result = paginationSchema.safeParse({ page: '0', limit: '20' });
    expect(result.success).toBe(false);
  });
});