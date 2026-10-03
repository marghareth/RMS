// FILE: src/lib/importMetrics.test.ts
import { describe, it, expect } from 'vitest';
import {
  summarizeImport,
  percent,
  csvCell,
  buildErrorReportCsv,
  buildSummaryCsv,
  IMPORT_ERROR_TYPES,
  type MetricsRow,
  type ImportIssue,
} from './importMetrics';

let n = 0;
const row = (over: Partial<MetricsRow> = {}): MetricsRow => ({
  rowNumber: ++n,
  raw: { fname: 'Juan', lname: 'Cruz' },
  data: {},
  errors: [],
  issues: [],
  isDuplicate: false,
  possibleDuplicates: [],
  ...over,
});
const invalid = (...issues: ImportIssue[]): MetricsRow =>
  row({ data: undefined, errors: issues.map((i) => `${i.field}: ${i.message}`), issues });
const dup = (type: 'DUPLICATE_EXISTING' | 'DUPLICATE_IN_FILE' = 'DUPLICATE_EXISTING'): MetricsRow =>
  row({ errors: ['Matches an existing resident (id 1)'], issues: [{ field: '', type, message: 'dup' }], isDuplicate: true });
const possible = (): MetricsRow =>
  row({
    possibleDuplicates: [
      { id: 7, fname: 'Jon', lname: 'Cruz', mname: null, birthdate: '1990-01-01', level: 'POSSIBLE', reason: 'NAME_TYPO', label: 'Name differs by one letter (same birthdate)' },
    ],
  });
const issue = (field: string, type: ImportIssue['type'], message = 'bad'): ImportIssue => ({ field, type, message });

describe('percent', () => {
  it('rounds to one decimal and is 0 for an empty denominator', () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(2, 3)).toBe(66.7);
    expect(percent(5, 5)).toBe(100);
    expect(percent(0, 0)).toBe(0);
  });
});

describe('summarizeImport', () => {
  it('handles an empty file without dividing by zero', () => {
    const s = summarizeImport([]);
    expect(s).toMatchObject({ total: 0, ready: 0, errors: 0, errorRate: 0, duplicateRate: 0 });
    for (const t of IMPORT_ERROR_TYPES) expect(s.errorsByType[t]).toBe(0);
  });

  it('a fully clean file has a 0% error rate', () => {
    const s = summarizeImport([row(), row(), row()]);
    expect(s).toMatchObject({ total: 3, ready: 3, valid: 3, errors: 0, errorRate: 0 });
  });

  it('splits invalid / duplicate / possible / ready into exclusive buckets', () => {
    const s = summarizeImport([
      row(), row(),                                          // 2 ready
      possible(),                                            // 1 possible
      dup(), dup('DUPLICATE_IN_FILE'),                       // 2 duplicates
      invalid(issue('fname', 'MISSING_REQUIRED')),           // 3 invalid
      invalid(issue('birthdate', 'INVALID_DATE')),
      invalid(issue('mobile', 'INVALID_FORMAT')),
    ]);
    expect(s).toMatchObject({
      total: 8, ready: 2, possibleDuplicates: 1, duplicates: 2, invalid: 3, errors: 5, valid: 3,
    });
  });

  it('INVARIANT: ready + possible + duplicates + invalid always equals total', () => {
    const files: MetricsRow[][] = [
      [],
      [row()],
      [dup(), invalid(issue('sex', 'INVALID_OPTION')), possible(), row()],
      Array.from({ length: 50 }, (_, i) =>
        i % 5 === 0 ? dup() : i % 5 === 1 ? invalid(issue('fname', 'MISSING_REQUIRED')) : i % 5 === 2 ? possible() : row()
      ),
    ];
    for (const rows of files) {
      const s = summarizeImport(rows);
      expect(s.ready + s.possibleDuplicates + s.duplicates + s.invalid).toBe(s.total);
      expect(s.errors).toBe(s.invalid + s.duplicates);
      expect(s.valid + s.errors).toBe(s.total);
    }
  });

  it('computes the headline error rate as (invalid + duplicate) / N and the component rates', () => {
    // 10 rows: 2 invalid, 1 duplicate, 1 possible, 6 ready
    const s = summarizeImport([
      invalid(issue('fname', 'MISSING_REQUIRED')), invalid(issue('sex', 'INVALID_OPTION')),
      dup(), possible(),
      row(), row(), row(), row(), row(), row(),
    ]);
    expect(s.errorRate).toBe(30);            // (2 + 1) / 10
    expect(s.validationErrorRate).toBe(20);  // 2 / 10
    expect(s.duplicateRate).toBe(10);        // 1 / 10
    expect(s.possibleDuplicateRate).toBe(10);// warning, NOT part of errorRate
  });

  it('does not count a possible duplicate as an error', () => {
    const s = summarizeImport([possible(), possible()]);
    expect(s.errors).toBe(0);
    expect(s.errorRate).toBe(0);
    expect(s.possibleDuplicates).toBe(2);
  });

  it('counts rows affected per type — a row with two bad fields of one type counts once', () => {
    const s = summarizeImport([
      invalid(issue('mobile', 'INVALID_FORMAT'), issue('email', 'INVALID_FORMAT')),
      invalid(issue('fname', 'MISSING_REQUIRED'), issue('mobile', 'INVALID_FORMAT')),
    ]);
    expect(s.errorsByType.INVALID_FORMAT).toBe(2);   // both rows, once each
    expect(s.errorsByType.MISSING_REQUIRED).toBe(1);
    expect(s.issueCount).toBe(4);                    // field-level problems, all counted
  });

  it('counts rows affected per field, and ignores whole-record (duplicate) issues there', () => {
    const s = summarizeImport([
      invalid(issue('mobile', 'INVALID_FORMAT')),
      invalid(issue('mobile', 'INVALID_FORMAT'), issue('birthdate', 'INVALID_DATE')),
      dup(),
    ]);
    expect(s.errorsByField).toEqual({ mobile: 2, birthdate: 1 });
    expect(s.errorsByType.DUPLICATE_EXISTING).toBe(1);
  });

  it('separates duplicates of existing residents from duplicates within the file', () => {
    const s = summarizeImport([dup('DUPLICATE_EXISTING'), dup('DUPLICATE_EXISTING'), dup('DUPLICATE_IN_FILE')]);
    expect(s.errorsByType.DUPLICATE_EXISTING).toBe(2);
    expect(s.errorsByType.DUPLICATE_IN_FILE).toBe(1);
  });

  it('still treats an error row with no structured issue as an error (never silently dropped)', () => {
    const s = summarizeImport([row({ data: undefined, errors: ['something'], issues: [] })]);
    expect(s.errors).toBe(1);
    expect(s.errorsByType.INVALID_FORMAT).toBe(1);
  });
});

describe('csvCell', () => {
  it('leaves simple values alone and quotes commas, quotes and newlines', () => {
    expect(csvCell('Juan')).toBe('Juan');
    expect(csvCell('Cruz, Juan')).toBe('"Cruz, Juan"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(42)).toBe('42');
  });

  it('neutralizes spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('+cmd|calc')).toBe("'+cmd|calc");
    expect(csvCell('-2+3+cmd')).toBe("'-2+3+cmd");
  });

  it('does not corrupt plain phone numbers / dates that start with + or -', () => {
    expect(csvCell('+639171234567')).toBe('+639171234567');
    expect(csvCell('+63 917 123 4567')).toBe('+63 917 123 4567');
    expect(csvCell('-5')).toBe('-5');
  });
});

describe('buildErrorReportCsv', () => {
  const columns = ['fname', 'lname', 'mobile'];
  const lines = (csv: string) => csv.trim().split('\r\n');

  it('lists only rows needing attention, with a header and the original values for correction', () => {
    const csv = buildErrorReportCsv(
      [
        row({ rowNumber: 2 }), // clean -> omitted
        invalid(issue('mobile', 'INVALID_FORMAT', 'must be a Philippine mobile number')),
      ].map((r, i) => ({ ...r, rowNumber: i + 2, raw: { fname: 'Ana', lname: 'Lopez', mobile: '12345' } })),
      columns
    );
    const out = lines(csv);
    expect(out[0]).toBe('Row,Status,Error types,Fields,Problems,fname,lname,mobile');
    expect(out).toHaveLength(2); // header + the one bad row
    expect(out[1]).toBe('3,ERROR,Invalid format,mobile,mobile: must be a Philippine mobile number,Ana,Lopez,12345');
  });

  it('labels statuses ERROR / DUPLICATE / POSSIBLE_DUPLICATE', () => {
    const csv = buildErrorReportCsv(
      [invalid(issue('fname', 'MISSING_REQUIRED')), dup(), possible(), row()],
      columns
    );
    const body = lines(csv).slice(1).map((l) => l.split(',')[1]);
    expect(body).toEqual(['ERROR', 'DUPLICATE', 'POSSIBLE_DUPLICATE']);
  });

  it('describes what a possible duplicate resembles', () => {
    const csv = buildErrorReportCsv([possible()], columns);
    expect(csv).toContain('Possible duplicate (warning)');
    expect(csv).toContain('looks like Jon Cruz (1990-01-01, #7)');
  });

  it('uses CRLF line endings and ends with a newline (opens cleanly in Excel)', () => {
    const csv = buildErrorReportCsv([dup()], columns);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.split('\r\n').length).toBeGreaterThan(2);
  });

  it('neutralizes formulas echoed from the uploaded file', () => {
    const csv = buildErrorReportCsv(
      [{ ...invalid(issue('fname', 'INVALID_FORMAT')), raw: { fname: '=1+1', lname: 'x', mobile: '' } }],
      columns
    );
    expect(csv).toContain("'=1+1");
  });

  it('produces just the header for a perfectly clean file', () => {
    expect(lines(buildErrorReportCsv([row(), row()], columns))).toHaveLength(1);
  });
});

describe('buildSummaryCsv', () => {
  it('reports the headline rate, the definition, and the breakdowns', () => {
    const summary = summarizeImport([
      invalid(issue('mobile', 'INVALID_FORMAT')), dup(), possible(), row(),
    ]);
    const csv = buildSummaryCsv(summary, { fileName: 'census.csv', generatedAt: new Date('2026-10-04T00:00:00Z') });
    expect(csv).toContain('File,census.csv');
    expect(csv).toContain('Generated,2026-10-04T00:00:00.000Z');
    expect(csv).toContain('Rows read (N),4');
    expect(csv).toContain('ERROR RATE = (invalid + duplicate) / N,50%');
    expect(csv).toContain('Possible-duplicate rate = possible / N,25%');
    expect(csv).toContain('Invalid format,1');
    expect(csv).toContain('Duplicate of an existing resident,1');
    expect(csv).toContain('mobile,1');
  });
});