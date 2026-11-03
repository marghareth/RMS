// FILE: src/lib/import-normalize.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeSex, normalizeCivilStatus, normalizeDate, findPurok, lookupKey } from './import-normalize';

describe('normalizeSex', () => {
  it.each([
    ['Male', 'MALE'], ['male', 'MALE'], [' M ', 'MALE'], ['Lalaki', 'MALE'],
    ['Female', 'FEMALE'], ['f', 'FEMALE'], ['BABAE', 'FEMALE'], ['MALE', 'MALE'],
  ])('%s -> %s', (input, out) => expect(normalizeSex(input)).toBe(out));

  it('leaves anything else alone so it still fails validation', () => {
    expect(normalizeSex('X')).toBe('X');
    expect(normalizeSex('')).toBe('');
  });
});

describe('normalizeCivilStatus', () => {
  it.each([
    ['Single', 'SINGLE'], ['married', 'MARRIED'], ['Kasal', 'MARRIED'], ['Widow', 'WIDOWED'],
    ['Biyuda', 'WIDOWED'], ['Separated', 'SEPARATED'], ['Live-in', 'LIVE_IN'], ['live in', 'LIVE_IN'],
    ['LIVE_IN', 'LIVE_IN'],
  ])('%s -> %s', (input, out) => expect(normalizeCivilStatus(input)).toBe(out));

  it('leaves unknown values alone', () => expect(normalizeCivilStatus('Complicated')).toBe('Complicated'));
});

describe('normalizeDate', () => {
  it.each([
    ['1990-03-15', '1990-03-15'],
    ['1990/3/5', '1990-03-05'],
    ['03/15/1990', '1990-03-15'],
    ['3-15-1990', '1990-03-15'],
    ['15/03/1990', '1990-03-15'], // first number can only be a day
    ['03/04/1990', '1990-03-04'], // ambiguous: read month first
    ['March 15, 1990', '1990-03-15'],
    ['Mar. 15 1990', '1990-03-15'],
    ['15 March 1990', '1990-03-15'],
    ['15-Mar-1990', '1990-03-15'],
    ['Marso 15, 1990', '1990-03-15'],
  ])('%s -> %s', (input, out) => expect(normalizeDate(input)).toBe(out));

  it("doesn't invent dates that don't exist", () => {
    expect(normalizeDate('02/30/1990')).toBe('02/30/1990');
    expect(normalizeDate('13/13/1990')).toBe('13/13/1990');
    expect(normalizeDate('soon')).toBe('soon');
  });
});

describe('findPurok', () => {
  const puroks = new Map([[lookupKey('Purok 1'), 1], [lookupKey('Sampaguita'), 2]]);
  it('ignores capitals and extra spaces', () => expect(findPurok('  PUROK   1 ', puroks)).toBe(1));
  it('accepts the number alone', () => expect(findPurok('1', puroks)).toBe(1));
  it('accepts an extra "Purok" in front', () => expect(findPurok('Purok Sampaguita', puroks)).toBe(2));
  it('returns undefined when nothing matches', () => expect(findPurok('Purok 9', puroks)).toBeUndefined());
});