// FILE: src/lib/field-rules.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  collapseSpaces,
  manilaToday,
  birthdateProblem,
  normalizePhMobile,
  personName,
  optionalPersonName,
  nameSuffix,
  birthdate,
  phMobile,
  phoneNumber,
  philsysNumber,
  zipCode,
} from './field-rules';

afterEach(() => vi.useRealTimers());

describe('collapseSpaces', () => {
  it('trims and collapses runs of whitespace', () => {
    expect(collapseSpaces('  Juan   dela \t Cruz \n')).toBe('Juan dela Cruz');
  });
  it('treats non-breaking spaces as whitespace', () => {
    expect(collapseSpaces('Juan\u00A0\u00A0Cruz')).toBe('Juan Cruz');
  });
});

describe('personName', () => {
  const schema = personName();

  it('normalizes spacing', () => {
    expect(schema.parse('  Maria   Clara ')).toBe('Maria Clara');
  });
  it.each(['Ma. Luisa', "D'Souza", 'Dela Cruz-Santos', 'Ñoño', 'José', "O’Brien"])(
    'accepts %s',
    (n) => expect(schema.safeParse(n).success).toBe(true)
  );
  it.each(['Juan123', '12345', 'Juan_Cruz', 'Juan@Cruz', '-Juan', '.', 'N/A!'])(
    'rejects %s',
    (n) => expect(schema.safeParse(n).success).toBe(false)
  );
  it('rejects blank / whitespace-only with the supplied message', () => {
    const r = personName({ requiredMessage: 'First name is required' }).safeParse('   ');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('First name is required');
  });
  it('reports a blank name exactly once (not also as a bad-character error)', () => {
    const r = personName({ requiredMessage: 'First name is required' }).safeParse('   ');
    expect(r.success).toBe(false);
    expect(r.error?.issues).toHaveLength(1);
    expect(r.error?.issues[0].message).toBe('First name is required');
  });
  it('rejects names over the max length', () => {
    expect(schema.safeParse('A'.repeat(101)).success).toBe(false);
  });
});

describe('optionalPersonName / nameSuffix', () => {
  it('allows an empty middle name and normalizes a present one', () => {
    expect(optionalPersonName().parse('')).toBe('');
    expect(optionalPersonName().parse('  de   la  ')).toBe('de la');
  });
  it('rejects digits in a middle name', () => {
    expect(optionalPersonName().safeParse('R2D2').success).toBe(false);
  });
  it.each(['Jr.', 'Sr.', 'III', 'IV', '2nd'])('accepts suffix %s', (s) =>
    expect(nameSuffix.safeParse(s).success).toBe(true)
  );
  it('rejects odd suffix characters', () => {
    expect(nameSuffix.safeParse('Jr.!!').success).toBe(false);
  });
});

describe('birthdate', () => {
  it('manilaToday uses Philippine time (UTC+8), not UTC', () => {
    // 2026-10-01T20:00Z is already Oct 2 in Manila
    expect(manilaToday(new Date('2026-10-01T20:00:00Z'))).toBe('2026-10-02');
    expect(manilaToday(new Date('2026-10-01T10:00:00Z'))).toBe('2026-10-01');
  });

  it('accepts an ordinary past date', () => {
    expect(birthdate.safeParse('1990-01-15').success).toBe(true);
  });

  it('accepts today, even when the server clock (UTC) is still on the previous day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T20:00:00Z')); // Oct 2, 04:00 in Manila
    expect(birthdate.safeParse('2026-10-02').success).toBe(true);
  });

  it('rejects tomorrow and any later date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T04:00:00Z'));
    const tomorrow = birthdate.safeParse('2026-10-02');
    expect(tomorrow.success).toBe(false);
    expect(tomorrow.error?.issues[0].message).toMatch(/future/);
    expect(birthdate.safeParse('2087-05-05').success).toBe(false);
  });

  it('rejects ages over 120 but accepts exactly 120', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T04:00:00Z'));
    expect(birthdate.safeParse('1906-10-01').success).toBe(true);
    const tooOld = birthdate.safeParse('1906-09-30');
    expect(tooOld.success).toBe(false);
    expect(tooOld.error?.issues[0].message).toMatch(/120/);
    expect(birthdate.safeParse('1850-01-01').success).toBe(false);
  });

  it('rejects unparseable input with the date-format hint', () => {
    const r = birthdate.safeParse('not a date');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/YYYY-MM-DD/);
  });

  it('birthdateProblem returns null for a valid date', () => {
    expect(birthdateProblem(new Date('2000-02-29T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))).toBeNull();
  });
});

describe('PH mobile', () => {
  it.each([
    ['09171234567', '09171234567'],
    ['+639171234567', '09171234567'],
    ['639171234567', '09171234567'],
    ['0917 123 4567', '09171234567'],
    ['0917-123-4567', '09171234567'],
    ['+63 917 123 4567', '09171234567'],
    ['(0917) 123-4567', '09171234567'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizePhMobile(input)).toBe(expected);
    expect(phMobile.parse(input)).toBe(expected);
  });

  it('treats blank as no value', () => {
    expect(phMobile.parse('')).toBeNull();
    expect(phMobile.parse('   ')).toBeNull();
  });

  it.each(['n/a', '12345', '0817123456', '091712345', '091712345678', '+1 415 555 0100', '0917123456a'])(
    'rejects %s',
    (v) => expect(phMobile.safeParse(v).success).toBe(false)
  );

  it('explains the Excel dropped-leading-zero case', () => {
    const r = phMobile.safeParse('9171234567');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/leading 0/);
  });
});

describe('landline', () => {
  it('accepts common formats and blank', () => {
    expect(phoneNumber.parse('(032) 200-1234')).toBe('(032) 200-1234');
    expect(phoneNumber.parse('')).toBeNull();
  });
  it('rejects letters and wrong digit counts', () => {
    expect(phoneNumber.safeParse('call me').success).toBe(false);
    expect(phoneNumber.safeParse('12345').success).toBe(false);
    expect(phoneNumber.safeParse('1'.repeat(13)).success).toBe(false);
  });
});

describe('PhilSys number', () => {
  it('accepts 12 or 16 digits and stores digits only', () => {
    expect(philsysNumber.parse('1234-5678-9012')).toBe('123456789012');
    expect(philsysNumber.parse('1234 5678 9012 3456')).toBe('1234567890123456');
  });
  it('treats blank as no value', () => {
    expect(philsysNumber.parse('')).toBeNull();
  });
  it.each(['12345', '1234-5678-90123', 'ABCD-5678-9012', '1234567890123'])('rejects %s', (v) =>
    expect(philsysNumber.safeParse(v).success).toBe(false)
  );
});

describe('ZIP code', () => {
  it('accepts exactly 4 digits and blank', () => {
    expect(zipCode.parse('6000')).toBe('6000');
    expect(zipCode.parse('')).toBeNull();
  });
  it.each(['600', '60000', '60 00', 'ABCD'])('rejects %s', (v) =>
    expect(zipCode.safeParse(v).success).toBe(false)
  );
});