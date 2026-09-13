// FILE: src/lib/finance.test.ts
import { describe, it, expect } from 'vitest';
import {
  fmtCurrency,
  fmtCompactCurrency,
  fmtDate,
  lastNMonths,
  APPROPRIATION_CATEGORY_LABELS,
  APPROPRIATION_CATEGORY_COLORS,
} from './finance';

describe('fmtCurrency', () => {
  it('formats a positive number as PHP currency with 2 decimals', () => {
    expect(fmtCurrency(1234.5)).toBe('₱1,234.50');
  });

  it('formats a numeric string', () => {
    expect(fmtCurrency('500')).toBe('₱500.00');
  });

  it('treats null as zero', () => {
    expect(fmtCurrency(null)).toBe('₱0.00');
  });

  it('treats undefined as zero', () => {
    expect(fmtCurrency(undefined)).toBe('₱0.00');
  });

  it('falls back to zero for non-finite values (NaN string)', () => {
    expect(fmtCurrency('not-a-number')).toBe('₱0.00');
  });

  it('handles negative numbers', () => {
    expect(fmtCurrency(-42)).toBe('-₱42.00');
  });
});

describe('fmtCompactCurrency', () => {
  it('compacts large numbers with a suffix', () => {
    // e.g. ₱1.2M — assert on the substring, not exact Intl output
    expect(fmtCompactCurrency(1200000)).toMatch(/₱1\.2M/);
  });

  it('treats null/undefined as zero', () => {
    expect(fmtCompactCurrency(null)).toBe('₱0.0');
    expect(fmtCompactCurrency(undefined)).toBe('₱0.0');
  });

  it('falls back to zero for non-finite input', () => {
    expect(fmtCompactCurrency('garbage')).toBe('₱0.0');
  });
});

describe('fmtDate', () => {
  it('formats an ISO date string as "Mon D, YYYY"', () => {
    expect(fmtDate('2026-03-05T00:00:00.000Z')).toBe('Mar 5, 2026');
  });

  it('returns an em dash for null', () => {
    expect(fmtDate(null)).toBe('—');
  });

  it('returns an em dash for undefined', () => {
    expect(fmtDate(undefined)).toBe('—');
  });

  it('returns an em dash for empty string', () => {
    expect(fmtDate('')).toBe('—');
  });
});

describe('lastNMonths', () => {
  it('returns exactly n entries', () => {
    expect(lastNMonths(6)).toHaveLength(6);
  });

  it('ends with the current month', () => {
    const months = lastNMonths(3);
    const now = new Date();
    const expectedKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(months[months.length - 1].key).toBe(expectedKey);
  });

  it('produces keys in chronological order with no gaps', () => {
    const months = lastNMonths(5);
    for (let i = 1; i < months.length; i++) {
      const [prevY, prevM] = months[i - 1].key.split('-').map(Number);
      const [curY, curM] = months[i].key.split('-').map(Number);
      const prevIndex = prevY * 12 + prevM;
      const curIndex = curY * 12 + curM;
      expect(curIndex - prevIndex).toBe(1);
    }
  });

  it('returns an empty array for n=0', () => {
    expect(lastNMonths(0)).toEqual([]);
  });
});

describe('category label/color maps', () => {
  it('has a label for every category', () => {
    expect(APPROPRIATION_CATEGORY_LABELS.PS).toBe('Personnel Services');
    expect(APPROPRIATION_CATEGORY_LABELS.MOOE).toBe('Maintenance & Other Operating Expenses');
    expect(APPROPRIATION_CATEGORY_LABELS.CO).toBe('Capital Outlay');
  });

  it('has a color for every category', () => {
    expect(APPROPRIATION_CATEGORY_COLORS.PS).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(APPROPRIATION_CATEGORY_COLORS.MOOE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(APPROPRIATION_CATEGORY_COLORS.CO).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});