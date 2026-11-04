// FILE: src/lib/form-rules.test.ts
import { describe, it, expect } from 'vitest';
import {
  residentProblems,
  blotterProblems,
  officialProblems,
  borrowProblems,
  appropriationProblems,
  moneyEntryProblems,
  meetingProblems,
  equipmentProblems,
  lifeEventProblems,
  sectorAgeProblem,
  ageOn,
  problemFor,
} from './form-rules';

// "Now" is fixed to 3 Nov 2026, 9 AM Manila, so the tests don't depend on the clock.
const NOW = new Date('2026-11-03T01:00:00Z');
const fields = (p: { field: string }[]) => p.map((x) => x.field);

describe('residentProblems', () => {
  it('the reported case: born yesterday, resident for 10 years', () => {
    const p = residentProblems({ birthdate: '2026-11-02', residency_start_date: '2016-11-02' }, NOW);
    expect(problemFor(p, 'residency_start_date')).toBe("Resident since can't be before the birthdate (November 2, 2026).");
  });

  it('accepts resident since on or after the birthdate', () => {
    expect(residentProblems({ birthdate: '1990-05-01', residency_start_date: '1990-05-01' }, NOW)).toEqual([]);
    expect(residentProblems({ birthdate: '1990-05-01', residency_start_date: '2010-01-01' }, NOW)).toEqual([]);
  });

  it('refuses resident since in the future', () => {
    expect(fields(residentProblems({ residency_start_date: '2027-01-01' }, NOW))).toEqual(['residency_start_date']);
  });

  it('refuses a child as married, widowed or separated, but allows single', () => {
    expect(problemFor(residentProblems({ birthdate: '2015-01-01', civil_status: 'MARRIED' }, NOW), 'civil_status')).toMatch(
      /11 years old, too young to be married/
    );
    expect(residentProblems({ birthdate: '2015-01-01', civil_status: 'SINGLE' }, NOW)).toEqual([]);
    expect(residentProblems({ birthdate: '1990-01-01', civil_status: 'MARRIED' }, NOW)).toEqual([]);
  });

  it('checks Senior and Youth sectors against age', () => {
    expect(fields(residentProblems({ birthdate: '1990-01-01', sector: 'SENIOR' }, NOW))).toEqual(['sector']);
    expect(residentProblems({ birthdate: '1950-01-01', sector: 'SENIOR' }, NOW)).toEqual([]);
    expect(fields(residentProblems({ birthdate: '1980-01-01', sector: 'YOUTH' }, NOW))).toEqual(['sector']);
  });

  it('checks the last voted year', () => {
    expect(problemFor(residentProblems({ birthdate: '2000-01-01', last_voted_year: '2010' }, NOW), 'last_voted_year')).toMatch(/too young/);
    expect(problemFor(residentProblems({ last_voted_year: '2030' }, NOW), 'last_voted_year')).toMatch(/future/);
    expect(problemFor(residentProblems({ last_voted_year: '22' }, NOW), 'last_voted_year')).toMatch(/4-digit/);
    expect(residentProblems({ birthdate: '1990-01-01', last_voted_year: '2022' }, NOW)).toEqual([]);
  });

  it('a resident voter must be a registered voter, and voters must be old enough', () => {
    expect(fields(residentProblems({ is_resident_voter: true, is_registered_voter: false }, NOW))).toEqual(['is_resident_voter']);
    expect(fields(residentProblems({ birthdate: '2020-01-01', is_registered_voter: true }, NOW))).toEqual(['is_registered_voter']);
  });

  it('spots height typed in centimetres', () => {
    expect(problemFor(residentProblems({ height_m: '165' }, NOW), 'height_m')).toBe('That looks like centimetres. Enter metres, e.g. 1.65.');
    expect(residentProblems({ height_m: '1.65', weight_kg: '60' }, NOW)).toEqual([]);
    expect(fields(residentProblems({ weight_kg: '0' }, NOW))).toEqual(['weight_kg']);
  });

  it('ignores blank values', () => {
    expect(residentProblems({ birthdate: '', residency_start_date: '', last_voted_year: '', height_m: '' }, NOW)).toEqual([]);
  });
});

describe('blotterProblems', () => {
  it('refuses a future incident and a hearing before the incident', () => {
    expect(fields(blotterProblems({ incident_date: '2026-12-01' }, NOW))).toEqual(['incident_date']);
    expect(fields(blotterProblems({ incident_date: '2026-10-10', hearing_date: '2026-10-01' }, NOW))).toEqual(['hearing_date']);
    expect(blotterProblems({ incident_date: '2026-10-10', hearing_date: '2026-11-20' }, NOW)).toEqual([]);
  });

  it('refuses the same resident as complainant and respondent', () => {
    expect(fields(blotterProblems({ complainant_id: 4, respondent_id: '4' }, NOW))).toEqual(['respondent_id']);
  });
});

describe('officialProblems', () => {
  it('term end has to be after term start', () => {
    expect(fields(officialProblems({ term_start: '2026-06-30', term_end: '2025-06-30' }))).toEqual(['term_end']);
    expect(fields(officialProblems({ term_start: '2026-06-30', term_end: '2026-06-30' }))).toEqual(['term_end']);
    expect(officialProblems({ term_start: '2023-11-30', term_end: '2026-06-30' })).toEqual([]);
  });

  it('the official must be 18 on the first day of the term', () => {
    expect(fields(officialProblems({ term_start: '2026-06-30' }, '2010-01-01'))).toEqual(['term_start']);
    expect(officialProblems({ term_start: '2026-06-30' }, '2008-06-30')).toEqual([]);
  });
});

describe('equipment', () => {
  it('borrowing: return on or after the borrow date (booking ahead is fine)', () => {
    expect(fields(borrowProblems({ date_borrowed: '2026-11-01', expected_return: '2026-10-30' }))).toEqual(['expected_return']);
    expect(borrowProblems({ date_borrowed: '2026-11-10', expected_return: '2026-11-12' })).toEqual([]);
    expect(borrowProblems({ date_borrowed: '2026-11-03', expected_return: '2026-11-03' })).toEqual([]);
  });

  it('acquired after purchased, neither in the future', () => {
    expect(fields(equipmentProblems({ purchase_date: '2026-05-01', date_acquired: '2026-04-01' }, NOW))).toEqual(['date_acquired']);
    expect(fields(equipmentProblems({ purchase_date: '2027-01-01' }, NOW))).toEqual(['purchase_date']);
  });
});

describe('finance', () => {
  it('obligated within appropriated, disbursed within obligated', () => {
    expect(fields(appropriationProblems({ appropriated_amount: 1000, obligated_amount: 1500 }))).toEqual(['obligated_amount']);
    expect(fields(appropriationProblems({ obligated_amount: 500, disbursed_amount: '600' }))).toEqual(['disbursed_amount']);
    expect(appropriationProblems({ appropriated_amount: 1000, obligated_amount: 800, disbursed_amount: 800 })).toEqual([]);
  });

  it('amounts above zero, dates not in the future', () => {
    expect(fields(moneyEntryProblems({ amount: 0, date: '2026-11-01' }, {}, NOW))).toEqual(['amount']);
    expect(fields(moneyEntryProblems({ amount: '1,500', date: '2026-12-01' }, {}, NOW))).toEqual(['date']);
    expect(moneyEntryProblems({ amount: 1500, date: '2026-11-03' }, {}, NOW)).toEqual([]);
  });
});

describe('meetingProblems', () => {
  it("can't be completed before it happens", () => {
    expect(fields(meetingProblems({ meeting_date: '2026-12-01', status: 'COMPLETED' }, NOW))).toEqual(['status']);
    expect(meetingProblems({ meeting_date: '2026-12-01', status: 'SCHEDULED' }, NOW)).toEqual([]);
    expect(fields(meetingProblems({ meeting_date: '2026-12-01', minutes: 'Called to order…' }, NOW))).toEqual(['minutes']);
    expect(meetingProblems({ meeting_date: '2026-10-01', minutes: 'Called to order…' }, NOW)).toEqual([]);
  });
});

describe('dates about a person', () => {
  it('not before they were born, not in the future', () => {
    expect(problemFor(lifeEventProblems('date_given', '1999-01-01', 'Date given', '2000-05-05', NOW), 'date_given')).toBe(
      "Date given can't be before the person's birthdate (May 5, 2000)."
    );
    expect(fields(lifeEventProblems('date_of_death', '2027-01-01', 'Date of death', '1950-01-01', NOW))).toEqual(['date_of_death']);
  });

  it('sector age limits', () => {
    expect(sectorAgeProblem('SENIOR_CITIZEN', '1990-01-01', NOW)).toMatch(/60 or older/);
    expect(sectorAgeProblem('PWD', '2020-01-01', NOW)).toBeNull();
  });

  it('ageOn counts whole years, birthday-aware', () => {
    expect(ageOn('2000-11-04', '2026-11-03')).toBe(25);
    expect(ageOn('2000-11-03', '2026-11-03')).toBe(26);
  });
});

describe('fieldProblems', () => {
  it('required, names, contacts, emails, amounts', async () => {
    const { fieldProblems } = await import('./form-rules');
    const p = fieldProblems([
      { field: 'a', label: 'Name', value: '', required: true },
      { field: 'b', label: 'Name', value: 'Juan2', kind: 'name' },
      { field: 'c', label: 'Contact', value: '0917-123-4567', kind: 'contact' },
      { field: 'd', label: 'Contact', value: '12', kind: 'contact' },
      { field: 'e', label: 'Email', value: 'juan@', kind: 'email' },
      { field: 'f', label: 'Amount', value: '-5', kind: 'money' },
      { field: 'g', label: 'Count', value: '1.5', kind: 'count' },
      { field: 'h', label: 'Name', value: "Ma. Dela Cruz-O'Neil", kind: 'name' },
    ]);
    expect(p.map((x) => x.field)).toEqual(['a', 'b', 'd', 'e', 'f', 'g']);
    expect(p[0].message).toBe('Name is required.');
  });
});