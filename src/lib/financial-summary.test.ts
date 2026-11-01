// FILE: src/lib/financial-summary.test.ts
import { describe, it, expect } from 'vitest';
import {
  manilaDayStart, manilaNextDayStart, manilaYearRange, manilaYearMonth, manilaCurrentYear, summarizeLedger,
} from './financial-summary';

describe('Manila day and year bounds', () => {
  it('starts a day at midnight Manila time (16:00 UTC the day before)', () => {
    expect(manilaDayStart('2026-01-01')!.toISOString()).toBe('2025-12-31T16:00:00.000Z');
  });

  it('ends date_to at the start of the next day, so the whole of Dec 31 is included', () => {
    const end = manilaNextDayStart('2026-12-31')!;
    expect(end.toISOString()).toBe('2026-12-31T16:00:00.000Z');
    // 11:30 PM on Dec 31 in Manila is still before the bound.
    expect(new Date('2026-12-31T23:30:00+08:00') < end).toBe(true);
    // The old parsing (new Date("2026-12-31")) cut off at 8:00 AM Manila.
    expect(new Date('2026-12-31T23:30:00+08:00') <= new Date('2026-12-31')).toBe(false);
  });

  it('rejects malformed and impossible dates', () => {
    expect(manilaDayStart('2026-13-01')).toBeNull();
    expect(manilaDayStart('2026-02-30')).toBeNull();
    expect(manilaDayStart('31/12/2026')).toBeNull();
    expect(manilaNextDayStart('')).toBeNull();
  });

  it('covers a full Manila calendar year', () => {
    const { gte, lt } = manilaYearRange(2026);
    expect(gte.toISOString()).toBe('2025-12-31T16:00:00.000Z');
    expect(lt.toISOString()).toBe('2026-12-31T16:00:00.000Z');
  });

  it('reads the calendar month as Manila sees it', () => {
    // 2026-02-28 23:00 UTC is already March 1 in Manila.
    expect(manilaYearMonth(new Date('2026-02-28T23:00:00Z'))).toEqual({ year: 2026, month: 2 });
    expect(manilaCurrentYear(new Date('2026-12-31T17:00:00Z'))).toBe(2027);
  });
});

describe('summarizeLedger', () => {
  const rows = [
    { transaction_type: 'INCOME', amount: '398500.00', transaction_date: new Date('2026-01-05T02:00:00Z') },
    { transaction_type: 'INCOME', amount: 45000, transaction_date: new Date('2026-01-20T02:00:00Z') },
    { transaction_type: 'EXPENSE', amount: '245000.50', transaction_date: new Date('2026-01-15T02:00:00Z') },
    { transaction_type: 'EXPENSE', amount: 12000, transaction_date: new Date('2026-03-12T02:00:00Z') },
    { transaction_type: 'INCOME', amount: 0.1, transaction_date: new Date('2026-03-01T02:00:00Z') },
    { transaction_type: 'INCOME', amount: 0.2, transaction_date: new Date('2026-03-02T02:00:00Z') },
  ];

  it('totals income, expense and balance (Decimal strings included)', () => {
    const s = summarizeLedger(rows);
    expect(s.income).toBe(443500.3);
    expect(s.expense).toBe(257000.5);
    expect(s.balance).toBe(186499.8);
  });

  it('groups by month, most recent first, skipping empty months', () => {
    const s = summarizeLedger(rows);
    expect(s.months.map((m) => m.key)).toEqual(['2026-03', '2026-01']);
    expect(s.months[1]).toEqual({ key: '2026-01', label: 'January 2026', income: 443500, expense: 245000.5 });
  });

  it('rounds to centavos (no 0.30000000000000004)', () => {
    expect(summarizeLedger(rows).months[0].income).toBe(0.3);
  });

  it('handles more than 100 records in a year (the old page cap)', () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ transaction_type: 'INCOME', amount: 100, transaction_date: new Date(Date.UTC(2026, i % 12, 10)) }));
    const s = summarizeLedger(many);
    expect(s.income).toBe(25000);
    expect(s.months).toHaveLength(12);
  });

  it('is empty for no records', () => {
    expect(summarizeLedger([])).toEqual({ income: 0, expense: 0, balance: 0, months: [] });
  });
});