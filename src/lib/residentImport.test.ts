// FILE: src/lib/residentImport.test.ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildImportTemplateCsv,
  parseImportFile,
  validateImportRow,
  ImportParseError,
  RESIDENT_IMPORT_COLUMNS,
  type ImportLookups,
} from './residentImport';

function emptyLookups(): ImportLookups {
  return { puroksByName: new Map(), householdsByNo: new Map() };
}

describe('buildImportTemplateCsv', () => {
  it('produces a header row of every column key, comma-separated', () => {
    const csv = buildImportTemplateCsv();
    const header = csv.trim().split(',');
    expect(header).toEqual(RESIDENT_IMPORT_COLUMNS.map((c) => c.key));
  });

  it('ends with a newline', () => {
    expect(buildImportTemplateCsv().endsWith('\n')).toBe(true);
  });
});

describe('parseImportFile — CSV', () => {
  it('parses a simple CSV keyed by column key', () => {
    const csv = 'fname,lname,birthdate,sex,civil_status\nJuan,Dela Cruz,1990-01-15,MALE,SINGLE\n';
    const rows = parseImportFile(Buffer.from(csv), 'residents.csv');
    expect(rows).toEqual([
      { fname: 'Juan', lname: 'Dela Cruz', birthdate: '1990-01-15', sex: 'MALE', civil_status: 'SINGLE' },
    ]);
  });

  it('matches headers case/whitespace-tolerantly, including human-readable labels', () => {
    const csv = ' First Name , LAST_NAME_DOES_NOT_EXIST\nMaria,Ignored\n';
    // "First Name" is a real label; the second header matches nothing and
    // should just be dropped rather than erroring out the whole row.
    const rows = parseImportFile(Buffer.from(csv), 'residents.csv');
    expect(rows).toEqual([{ fname: 'Maria' }]);
  });

  it('trims values and drops unrecognized columns', () => {
    const csv = 'fname,lname,some_random_column\n  Ana  , Reyes ,whatever\n';
    const rows = parseImportFile(Buffer.from(csv), 'residents.csv');
    expect(rows).toEqual([{ fname: 'Ana', lname: 'Reyes' }]);
  });

  it('skips empty lines', () => {
    const csv = 'fname,lname\nAna,Reyes\n\n';
    const rows = parseImportFile(Buffer.from(csv), 'residents.csv');
    expect(rows).toHaveLength(1);
  });

  it('throws ImportParseError on malformed CSV', () => {
    // Papa Parse reports quote errors for unterminated quoted fields.
    const badCsv = 'fname,lname\n"Unterminated,Quote\n';
    expect(() => parseImportFile(Buffer.from(badCsv), 'residents.csv')).toThrow(ImportParseError);
  });
});

describe('parseImportFile — XLSX', () => {
  it('parses a workbook the same way as CSV', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['fname', 'lname', 'sex'],
      ['Pedro', 'Santos', 'MALE'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const rows = parseImportFile(buffer, 'residents.xlsx');
    expect(rows).toEqual([{ fname: 'Pedro', lname: 'Santos', sex: 'MALE' }]);
  });

  it('converts embedded Date cells to YYYY-MM-DD strings', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['fname', 'birthdate'],
      ['Pedro', new Date(Date.UTC(1990, 0, 15))],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellDates: true });

    const rows = parseImportFile(buffer, 'residents.xlsx');
    expect(rows[0].birthdate).toBe('1990-01-15');
  });

  it('recognizes .xls extension as Excel too', () => {
    const ws = XLSX.utils.aoa_to_sheet([['fname'], ['Ana']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const rows = parseImportFile(buffer, 'residents.xls');
    expect(rows).toEqual([{ fname: 'Ana' }]);
  });
});

describe('validateImportRow', () => {
  const validRaw = {
    fname: 'Juan',
    lname: 'Dela Cruz',
    mname: '',
    name_extension: '',
    birthdate: '1990-01-15',
    sex: 'MALE',
    civil_status: 'SINGLE',
    purok_name: '',
    household_no: '',
    place_of_birth: '',
    religion: '',
    employment_status: '',
    educational_attainment: '',
    occupation: '',
    income_bracket: '',
    mobile: '',
    email: '',
  };

  it('accepts a fully valid minimal row', () => {
    const result = validateImportRow(1, validRaw, emptyLookups());
    expect(result.errors).toEqual([]);
    expect(result.data).toBeDefined();
    expect(result.data?.fname).toBe('Juan');
    expect(result.data?.sex).toBe('MALE');
    expect(result.data?.purok_id).toBeNull();
    expect(result.data?.household_id).toBeNull();
    expect(result.isDuplicate).toBe(false);
  });

  it('reports an error for missing required fields', () => {
    const result = validateImportRow(2, { ...validRaw, fname: '' }, emptyLookups());
    expect(result.data).toBeUndefined();
    expect(result.errors.some((e) => e.startsWith('fname:'))).toBe(true);
  });

  it('rejects an invalid sex value', () => {
    const result = validateImportRow(3, { ...validRaw, sex: 'OTHER' }, emptyLookups());
    expect(result.data).toBeUndefined();
    expect(result.errors.some((e) => e.startsWith('sex:'))).toBe(true);
  });

  it('rejects an invalid birthdate', () => {
    const result = validateImportRow(4, { ...validRaw, birthdate: 'not-a-date' }, emptyLookups());
    expect(result.data).toBeUndefined();
    expect(result.errors.some((e) => e.startsWith('birthdate:'))).toBe(true);
  });

  it('rejects a malformed email but allows an empty one', () => {
    const bad = validateImportRow(5, { ...validRaw, email: 'not-an-email' }, emptyLookups());
    expect(bad.errors.some((e) => e.startsWith('email:'))).toBe(true);

    const empty = validateImportRow(6, { ...validRaw, email: '' }, emptyLookups());
    expect(empty.errors).toEqual([]);
  });

  it('resolves purok_name to purok_id via lookups', () => {
    const lookups: ImportLookups = {
      puroksByName: new Map([['purok 1', 7]]),
      householdsByNo: new Map(),
    };
    const result = validateImportRow(7, { ...validRaw, purok_name: 'Purok 1' }, lookups);
    expect(result.errors).toEqual([]);
    expect(result.data?.purok_id).toBe(7);
  });

  it('errors when purok_name has no match', () => {
    const result = validateImportRow(8, { ...validRaw, purok_name: 'Nonexistent Purok' }, emptyLookups());
    expect(result.errors.some((e) => e.includes('purok_name'))).toBe(true);
  });

  it('errors when household_no has no match', () => {
    const result = validateImportRow(9, { ...validRaw, household_no: 'HH-999' }, emptyLookups());
    expect(result.errors.some((e) => e.includes('household_no'))).toBe(true);
  });

  it("prefers the household's purok over a conflicting purok_name", () => {
    const lookups: ImportLookups = {
      puroksByName: new Map([['purok 1', 1]]),
      householdsByNo: new Map([['hh-100', { id: 55, purok_id: 9 }]]),
    };
    const result = validateImportRow(10, { ...validRaw, purok_name: 'Purok 1', household_no: 'HH-100' }, lookups);
    expect(result.errors).toEqual([]);
    expect(result.data?.household_id).toBe(55);
    expect(result.data?.purok_id).toBe(9); // household's purok wins over the conflicting purok_name
  });

  it("fills purok_id from the household when purok_name wasn't given", () => {
    const lookups: ImportLookups = {
      puroksByName: new Map(),
      householdsByNo: new Map([['hh-100', { id: 55, purok_id: 9 }]]),
    };
    const result = validateImportRow(11, { ...validRaw, household_no: 'HH-100' }, lookups);
    expect(result.data?.purok_id).toBe(9);
    expect(result.data?.household_id).toBe(55);
  });

  it('preserves the raw row and row number on both success and failure', () => {
    const raw = { ...validRaw, fname: '' };
    const result = validateImportRow(42, raw, emptyLookups());
    expect(result.rowNumber).toBe(42);
    expect(result.raw).toBe(raw);
  });
});