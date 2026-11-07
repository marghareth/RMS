// FILE: src/lib/category-lists.test.ts
import { describe, it, expect } from 'vitest';
import { cleanList, parseStoredList, LIST_MAX_ITEMS, ITEM_MAX_LENGTH, FINANCIAL_CATEGORY_DEFAULTS } from './category-lists';

describe('cleanList', () => {
  it('trims, collapses spaces, and drops blanks and case-insensitive duplicates (first wins)', () => {
    expect(cleanList(['  Office  Supplies ', '', 'office supplies', 'Fuel', '   '])).toEqual({ list: ['Office Supplies', 'Fuel'] });
  });

  it('refuses an empty result', () => {
    expect(cleanList(['', '  '])).toEqual({ problem: expect.stringContaining('at least one') });
  });

  it('refuses entries that are too long', () => {
    expect(cleanList(['x'.repeat(ITEM_MAX_LENGTH + 1)])).toHaveProperty('problem');
  });

  it('refuses too many entries', () => {
    const many = Array.from({ length: LIST_MAX_ITEMS + 1 }, (_, i) => `Item ${i}`);
    expect(cleanList(many)).toHaveProperty('problem');
  });

  it('refuses anything that is not a list of text', () => {
    expect(cleanList('Fuel')).toHaveProperty('problem');
    expect(cleanList(['Fuel', 5])).toHaveProperty('problem');
  });
});

describe('parseStoredList', () => {
  const fallback = FINANCIAL_CATEGORY_DEFAULTS.INCOME;

  it('reads a saved list', () => {
    expect(parseStoredList('["Donations","Rentals"]', fallback)).toEqual(['Donations', 'Rentals']);
  });

  it('falls back to the defaults when nothing is saved, or the value is unreadable', () => {
    expect(parseStoredList(null, fallback)).toEqual(fallback);
    expect(parseStoredList('not json', fallback)).toEqual(fallback);
    expect(parseStoredList('[]', fallback)).toEqual(fallback);
  });

  it('returns a copy, so callers cannot change the defaults', () => {
    const out = parseStoredList(undefined, fallback);
    out.push('Changed');
    expect(fallback).not.toContain('Changed');
  });
});