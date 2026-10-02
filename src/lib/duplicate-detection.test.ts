// FILE: src/lib/duplicate-detection.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  nameKey,
  birthdateISO,
  editDistance,
  isBirthdateTypo,
  compareIdentities,
  DuplicateIndex,
  findDuplicates,
  toMatchInfo,
  describeMatch,
  candidateWhere,
} from './duplicate-detection';

const juan = { id: 1, fname: 'Juan', lname: 'Dela Cruz', mname: 'Santos', birthdate: new Date('1990-05-05') };
const person = (over: Record<string, unknown> = {}) => ({ ...juan, id: undefined, ...over }) as any;

describe('normalizeName / nameKey', () => {
  it('ignores case, accents, punctuation and spacing', () => {
    expect(normalizeName('  José   Dela-Cruz Jr. ')).toBe('jose dela cruz jr');
    expect(normalizeName("O'Brien")).toBe('o brien');
    expect(normalizeName('Niño')).toBe('nino');
  });
  it('nameKey also removes spaces so "De la Cruz" = "Dela Cruz"', () => {
    expect(nameKey('De la Cruz')).toBe(nameKey('Dela-Cruz'));
    expect(nameKey('DELACRUZ')).toBe('delacruz');
  });
  it('handles null / empty', () => {
    expect(normalizeName(null)).toBe('');
    expect(nameKey(undefined)).toBe('');
  });
});

describe('birthdateISO', () => {
  it('accepts a Date or a string starting with a date', () => {
    expect(birthdateISO(new Date('1990-05-05T00:00:00Z'))).toBe('1990-05-05');
    expect(birthdateISO('1990-05-05T08:00:00.000Z')).toBe('1990-05-05');
  });
});

describe('editDistance', () => {
  it.each([
    ['john', 'john', 0],
    ['jon', 'john', 1],       // deletion
    ['john', 'jhon', 1],      // adjacent transposition counts as ONE
    ['santos', 'santoz', 1],  // substitution
    ['ana', 'anna', 1],       // insertion
    ['maria', 'mario', 1],
  ])('%s vs %s = %i', (a, b, d) => expect(editDistance(a, b, 2)).toBe(d));

  it('returns max+1 when clearly further apart (and bails early on length gap)', () => {
    expect(editDistance('juan', 'pedro', 2)).toBe(3);
    expect(editDistance('a', 'abcdef', 1)).toBe(2);
  });
});

describe('isBirthdateTypo', () => {
  it('flags day/month swapped', () => {
    expect(isBirthdateTypo('2000-03-12', '2000-12-03')).toBe(true);
  });
  it('flags one wrong digit', () => {
    expect(isBirthdateTypo('1990-05-10', '1990-05-11')).toBe(true);
    expect(isBirthdateTypo('1990-05-05', '1991-05-05')).toBe(true);
  });
  it('flags two adjacent digits swapped', () => {
    expect(isBirthdateTypo('1998-05-05', '1989-05-05')).toBe(true);
  });
  it('does not flag unrelated dates or identical ones', () => {
    expect(isBirthdateTypo('1990-05-05', '1985-11-23')).toBe(false);
    expect(isBirthdateTypo('1990-05-05', '1990-05-05')).toBe(false);
  });
});

describe('compareIdentities', () => {
  it('EXACT: same name + birthdate, even with different case/accents/spacing/punctuation', () => {
    expect(compareIdentities(person(), juan)).toBe('EXACT');
    expect(compareIdentities(person({ fname: 'JUAN', lname: 'dela-cruz' }), juan)).toBe('EXACT');
    expect(compareIdentities(person({ fname: 'Juán', lname: 'Delacruz' }), juan)).toBe('EXACT');
  });

  it('catches the classic Jon/John slip', () => {
    const john = { fname: 'John', lname: 'Cruz', birthdate: new Date('1990-05-05') };
    expect(compareIdentities({ ...john, fname: 'Jon' }, john)).toBe('NAME_TYPO');
    expect(compareIdentities({ ...john, fname: 'Jhon' }, john)).toBe('NAME_TYPO');
  });

  it('EXACT ignores middle name (same person, middle name often missing)', () => {
    expect(compareIdentities(person({ mname: null }), juan)).toBe('EXACT');
  });

  it('SWAPPED_NAMES: first and last exchanged, same birthdate', () => {
    expect(compareIdentities(person({ fname: 'Dela Cruz', lname: 'Juan' }), juan)).toBe('SWAPPED_NAMES');
  });

  it.each([
    ['Jua', 'Dela Cruz'],        // first name, deletion
    ['Juam', 'Dela Cruz'],       // first name, substitution
    ['Jaun', 'Dela Cruz'],       // transposition
    ['Juan', 'Dela Cruzz'],      // last name, insertion
  ])('NAME_TYPO: %s %s (same birthdate)', (fname, lname) => {
    expect(compareIdentities(person({ fname, lname }), juan)).toBe('NAME_TYPO');
  });

  it('does NOT treat two letters of difference as a typo', () => {
    expect(compareIdentities(person({ fname: 'Jose' }), juan)).toBeNull();
    expect(compareIdentities(person({ fname: 'Jon' }), juan)).toBeNull(); // Juan -> Jon is 2 edits
    // one letter in EACH name = distance 2 overall
    expect(compareIdentities(person({ fname: 'Juam', lname: 'Dela Cruzz' }), juan)).toBeNull();
  });

  it('BIRTHDATE_TYPO: same name, birthdate day/month swapped', () => {
    const existing = { ...juan, birthdate: new Date('2000-03-12') };
    expect(compareIdentities(person({ birthdate: new Date('2000-12-03') }), existing)).toBe('BIRTHDATE_TYPO');
  });

  it('BIRTHDATE_TYPO: same name, one wrong digit', () => {
    expect(compareIdentities(person({ birthdate: new Date('1990-05-06') }), juan)).toBe('BIRTHDATE_TYPO');
  });

  it('different person: unrelated birthdate and/or name', () => {
    expect(compareIdentities(person({ birthdate: new Date('1962-11-23') }), juan)).toBeNull();
    expect(compareIdentities(person({ fname: 'Pedro', lname: 'Reyes' }), juan)).toBeNull();
  });

  it('a differing suffix (Jr./Sr.) rules out FUZZY matches — father and son', () => {
    const father = { ...juan, name_extension: 'Sr.' };
    // son typed with a near birthdate would otherwise look like a birthdate typo
    expect(compareIdentities(person({ name_extension: 'Jr.', birthdate: new Date('1990-05-06') }), father)).toBeNull();
    // ...but identical suffix (or none) still matches
    expect(compareIdentities(person({ name_extension: 'Sr.', birthdate: new Date('1990-05-06') }), father)).toBe('BIRTHDATE_TYPO');
  });

  it('identical first and last name is not reported as "swapped"', () => {
    const ana = { fname: 'Ana', lname: 'Ana', birthdate: new Date('2001-01-01') };
    expect(compareIdentities(ana, ana)).toBe('EXACT');
  });
});

describe('DuplicateIndex', () => {
  const existing = [
    { id: 1, fname: 'Juan', lname: 'Dela Cruz', birthdate: new Date('1990-05-05') },
    { id: 2, fname: 'Maria', lname: 'Santos', birthdate: new Date('1985-01-20') },
    { id: 3, fname: 'Pedro', lname: 'Reyes', birthdate: new Date('1990-05-05') }, // same birthdate, different person
  ];

  it('returns nothing for a genuinely new person', () => {
    expect(new DuplicateIndex(existing).find({ fname: 'Ana', lname: 'Lopez', birthdate: new Date('1999-09-09') })).toEqual([]);
  });

  it('finds an exact match among records sharing a birthdate, ignoring the rest', () => {
    const hits = new DuplicateIndex(existing).find({ fname: 'JUAN', lname: 'dela cruz', birthdate: '1990-05-05' });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ level: 'EXACT', reason: 'EXACT', record: { id: 1 } });
  });

  it('finds a birthdate typo via the name bucket (different birthdate)', () => {
    const hits = new DuplicateIndex(existing).find({ fname: 'Maria', lname: 'Santos', birthdate: new Date('1985-10-20') });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ level: 'POSSIBLE', reason: 'BIRTHDATE_TYPO', record: { id: 2 } });
  });

  it('sorts the strongest match first', () => {
    const idx = new DuplicateIndex([
      { id: 10, fname: 'Jon', lname: 'Cruz', birthdate: new Date('1990-05-05') },  // typo
      { id: 11, fname: 'John', lname: 'Cruz', birthdate: new Date('1990-05-05') }, // exact
    ]);
    const hits = idx.find({ fname: 'John', lname: 'Cruz', birthdate: new Date('1990-05-05') });
    expect(hits.map((h) => h.reason)).toEqual(['EXACT', 'NAME_TYPO']);
  });

  it('add() lets later lookups see earlier additions (used for rows within one import file)', () => {
    const idx = new DuplicateIndex<{ id: number; fname: string; lname: string; birthdate: string }>();
    const first = { id: 1, fname: 'Ana', lname: 'Lopez', birthdate: '2001-02-03' };
    expect(idx.find(first)).toEqual([]);
    idx.add(first);
    expect(idx.find({ fname: 'Ana', lname: 'Lopez', birthdate: '2001-02-03' })[0].level).toBe('EXACT');
  });

  it('findDuplicates is a one-shot wrapper', () => {
    expect(findDuplicates({ fname: 'Juan', lname: 'Dela Cruz', birthdate: '1990-05-05' }, existing)[0].record.id).toBe(1);
  });
});

describe('API helpers', () => {
  it('toMatchInfo / describeMatch produce JSON-safe, readable output', () => {
    const [hit] = findDuplicates({ fname: 'Juan', lname: 'Dela Cruz', birthdate: '1990-05-05' }, [juan]);
    const info = toMatchInfo(hit);
    expect(info).toMatchObject({ id: 1, birthdate: '1990-05-05', level: 'EXACT', reason: 'EXACT' });
    expect(() => JSON.stringify(info)).not.toThrow();
    expect(describeMatch(info)).toBe('Juan Santos Dela Cruz (1990-05-05, #1)');
  });

  it('candidateWhere pre-filters on birthdate OR case-insensitive first+last name', () => {
    const where = candidateWhere({ fname: 'Juan', lname: 'Cruz', birthdate: new Date('1990-05-05') });
    expect(where.OR).toHaveLength(2);
    expect(where.OR![1]).toEqual({
      fname: { equals: 'Juan', mode: 'insensitive' },
      lname: { equals: 'Cruz', mode: 'insensitive' },
    });
  });
});