// FILE: src/app/api/residents/import/preview/route.test.ts
// @vitest-environment node
//
// This suite constructs multipart FormData with real File objects and
// round-trips them through NextRequest.formData(). Under the default
// jsdom test environment, `new File(...)` in this file resolves to
// jsdom's File class, but NextRequest's internal multipart parser
// constructs File instances from Node/undici's File class instead — two
// different constructors from two different realms, so `file instanceof
// File` in the route (a legitimate, correct check) fails even for a
// genuine file. That mismatch is a test-environment artifact: real
// Next.js requests are parsed entirely within Node, with no jsdom
// involved, so this can't happen in production. Running this file under
// the `node` environment instead keeps both sides using the same File
// class.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    purok: { findMany: vi.fn() },
    household: { findMany: vi.fn() },
    resident: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeFileReq(filename: string, content: string) {
  const form = new FormData();
  form.append('file', new File([content], filename, { type: 'text/csv' }));
  return new NextRequest('http://localhost/api/residents/import/preview', { method: 'POST', body: form });
}

const VALID_ROW = 'fname,lname,birthdate,sex,civil_status\nJuan,Dela Cruz,1990-01-15,MALE,SINGLE\n';

describe('POST /api/residents/import/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
    (prisma.purok.findMany as any).mockResolvedValue([]);
    (prisma.household.findMany as any).mockResolvedValue([]);
    (prisma.resident.findMany as any).mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await POST(makeFileReq('r.csv', VALID_ROW));
    expect(res.status).toBe(401);
  });

  it('rejects a request with no file', async () => {
    const form = new FormData();
    const req = new NextRequest('http://localhost/api/residents/import/preview', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('NO_FILE');
  });

  it('rejects an unsupported file extension', async () => {
    const res = await POST(makeFileReq('residents.pdf', VALID_ROW));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('BAD_FILE_TYPE');
  });

  it('rejects a malformed CSV with a PARSE_ERROR', async () => {
    const res = await POST(makeFileReq('r.csv', 'fname,lname\n"Unterminated,Quote\n'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PARSE_ERROR');
  });

  it('rejects an empty file (headers only, no data rows)', async () => {
    const res = await POST(makeFileReq('r.csv', 'fname,lname\n'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('EMPTY_FILE');
  });

  it('rejects a file with more than 500 rows', async () => {
    const header = 'fname,lname\n';
    const rows = Array.from({ length: 501 }, (_, i) => `Person${i},Test`).join('\n');
    const res = await POST(makeFileReq('r.csv', header + rows));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('TOO_MANY_ROWS');
  });

  it('returns a valid-row summary for a clean file', async () => {
    const res = await POST(makeFileReq('r.csv', VALID_ROW));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toMatchObject({ total: 1, valid: 1, ready: 1, errors: 0, invalid: 0, duplicates: 0, possibleDuplicates: 0, errorRate: 0 });
    expect(body.rows[0].possibleDuplicates).toEqual([]);
    expect(body.rows[0].data.fname).toBe('Juan');
  });

  it('flags a row that duplicates an earlier row in the same file', async () => {
    const csv = 'fname,lname,birthdate,sex,civil_status\n' +
      'Juan,Dela Cruz,1990-01-15,MALE,SINGLE\n' +
      'Juan,Dela Cruz,1990-01-15,MALE,SINGLE\n';
    const res = await POST(makeFileReq('r.csv', csv));
    const body = await res.json();

    expect(body.summary.total).toBe(2);
    expect(body.rows[0].isDuplicate).toBe(false);
    expect(body.rows[1].isDuplicate).toBe(true);
    expect(body.rows[1].errors.some((e: string) => e.includes('Duplicate of an earlier row'))).toBe(true);
  });

  it('flags a row that matches an existing resident in the database', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([
      { id: 42, fname: 'Juan', lname: 'Dela Cruz', birthdate: new Date('1990-01-15') },
    ]);

    const res = await POST(makeFileReq('r.csv', VALID_ROW));
    const body = await res.json();

    expect(body.rows[0].isDuplicate).toBe(true);
    expect(body.rows[0].errors.some((e: string) => e.includes('id 42'))).toBe(true);
  });

  it('counts errored rows separately from valid ones in the summary', async () => {
    const csv = 'fname,lname,sex\nJuan,Dela Cruz,MALE\n,Missing First Name,MALE\n';
    const res = await POST(makeFileReq('r.csv', csv));
    const body = await res.json();
    // Row 1 is missing required fields (birthdate/civil_status) -> error;
    // row 2 has an empty fname -> error too.
    expect(body.summary.valid).toBe(0);
    expect(body.summary.errors).toBe(2);
  });

  const HEADER = 'fname,lname,birthdate,sex,civil_status\n';
  const existing = (over: Record<string, unknown> = {}) => ({
    id: 42, fname: 'Juan', lname: 'Dela Cruz', mname: null, name_extension: null,
    birthdate: new Date('1990-01-15'), ...over,
  });

  it('treats case / accent / punctuation variants of an existing resident as an exact duplicate', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existing({ fname: 'José', lname: 'Dela-Cruz' })]);
    const res = await POST(makeFileReq('r.csv', HEADER + 'JOSE,dela cruz,1990-01-15,MALE,SINGLE\n'));
    const body = await res.json();
    expect(body.rows[0].isDuplicate).toBe(true);
    expect(body.summary.duplicates).toBe(1);
  });

  it('warns (but does not block) on swapped first/last name', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existing()]);
    const res = await POST(makeFileReq('r.csv', HEADER + 'Dela Cruz,Juan,1990-01-15,MALE,SINGLE\n'));
    const body = await res.json();

    const row = body.rows[0];
    expect(row.isDuplicate).toBe(false);
    expect(row.errors).toEqual([]);
    expect(row.possibleDuplicates).toHaveLength(1);
    expect(row.possibleDuplicates[0]).toMatchObject({ id: 42, level: 'POSSIBLE', reason: 'SWAPPED_NAMES' });
    expect(body.summary).toMatchObject({ valid: 1, duplicates: 0, possibleDuplicates: 1 });
  });

  it('warns on a one-letter name typo against an existing resident', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existing({ fname: 'John', lname: 'Cruz' })]);
    const res = await POST(makeFileReq('r.csv', HEADER + 'Jhon,Cruz,1990-01-15,MALE,SINGLE\n'));
    const body = await res.json();
    expect(body.rows[0].possibleDuplicates[0].reason).toBe('NAME_TYPO');
  });

  it('warns on a likely birthdate typo (day/month swapped) against an existing resident', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existing({ birthdate: new Date('2000-03-12') })]);
    const res = await POST(makeFileReq('r.csv', HEADER + 'Juan,Dela Cruz,2000-12-03,MALE,SINGLE\n'));
    const body = await res.json();
    expect(body.rows[0].possibleDuplicates[0]).toMatchObject({ id: 42, reason: 'BIRTHDATE_TYPO' });
  });

  it('warns about a near-match to an EARLIER ROW of the same file, pointing at that row', async () => {
    const csv = HEADER +
      'John,Cruz,1990-01-15,MALE,SINGLE\n' +
      'Jon,Cruz,1990-01-15,MALE,SINGLE\n';
    const res = await POST(makeFileReq('r.csv', csv));
    const body = await res.json();

    expect(body.rows[0].possibleDuplicates).toEqual([]);
    expect(body.rows[1].isDuplicate).toBe(false);
    expect(body.rows[1].possibleDuplicates[0]).toMatchObject({ reason: 'NAME_TYPO', rowNumber: 1, id: null });
  });

  it('does not flag genuinely different people who merely share a birthdate', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existing({ fname: 'Pedro', lname: 'Reyes' })]);
    const res = await POST(makeFileReq('r.csv', VALID_ROW));
    const body = await res.json();
    expect(body.rows[0].possibleDuplicates).toEqual([]);
    expect(body.rows[0].isDuplicate).toBe(false);
  });

  it('queries existing residents once for the whole file, not per row', async () => {
    const csv = HEADER + 'Ana,Lopez,1991-01-01,FEMALE,SINGLE\nBen,Uy,1992-02-02,MALE,SINGLE\nCarl,Go,1993-03-03,MALE,SINGLE\n';
    await POST(makeFileReq('r.csv', csv));
    expect(prisma.resident.findMany).toHaveBeenCalledTimes(1);
  });

  describe('import error metrics', () => {
    const H = 'fname,lname,birthdate,sex,civil_status,mobile\n';

    it('reports separate counts, per-type and per-field breakdowns, and the error rate for a messy file', async () => {
      (prisma.resident.findMany as any).mockResolvedValue([
        { id: 42, fname: 'Maria', lname: 'Santos', mname: null, name_extension: null, birthdate: new Date('1985-01-20') },
      ]);
      const csv = H +
        'Ana,Lopez,1991-01-01,FEMALE,SINGLE,09171234567\n' +   // 1 ready
        'Ben,Uy,1992-02-02,MALE,SINGLE,\n' +                    // 2 ready
        ',Reyes,1993-03-03,MALE,SINGLE,\n' +                    // 3 invalid: missing fname
        'Carl,Go,2087-01-01,MALE,SINGLE,\n' +                   // 4 invalid: future birthdate
        'Dan,Ng,1994-04-04,M,SINGLE,n/a\n' +                    // 5 invalid: bad sex + bad mobile
        'Maria,Santos,1985-01-20,FEMALE,MARRIED,\n' +           // 6 duplicate of existing #42
        'Ana,Lopez,1991-01-01,FEMALE,SINGLE,\n' +               // 7 duplicate of row 1
        'Maira,Santos,1985-01-20,FEMALE,MARRIED,\n';            // 8 possible (typo of #42)

      const res = await POST(makeFileReq('messy.csv', csv));
      const { summary } = await res.json();

      expect(summary).toMatchObject({
        total: 8, ready: 2, invalid: 3, duplicates: 2, possibleDuplicates: 1,
        errors: 5, valid: 3,
        errorRate: 62.5,            // (3 + 2) / 8
        validationErrorRate: 37.5,  // 3 / 8
        duplicateRate: 25,          // 2 / 8
        possibleDuplicateRate: 12.5,
      });
      // the four buckets partition the file
      expect(summary.ready + summary.invalid + summary.duplicates + summary.possibleDuplicates).toBe(summary.total);

      expect(summary.errorsByType).toMatchObject({
        MISSING_REQUIRED: 1,
        INVALID_DATE: 1,
        INVALID_OPTION: 1,
        INVALID_FORMAT: 1,
        UNKNOWN_REFERENCE: 0,
        DUPLICATE_EXISTING: 1,
        DUPLICATE_IN_FILE: 1,
      });
      expect(summary.errorsByField).toMatchObject({ fname: 1, birthdate: 1, sex: 1, mobile: 1 });
    });

    it('includes structured issues on each row so the UI / error report can show types', async () => {
      const res = await POST(makeFileReq('r.csv', H + ',Reyes,1993-03-03,MALE,SINGLE,\n'));
      const { rows } = await res.json();
      expect(rows[0].issues).toEqual([
        expect.objectContaining({ field: 'fname', type: 'MISSING_REQUIRED' }),
      ]);
    });

    it('tags duplicate rows with a whole-record issue (no field)', async () => {
      (prisma.resident.findMany as any).mockResolvedValue([
        { id: 42, fname: 'Maria', lname: 'Santos', mname: null, name_extension: null, birthdate: new Date('1985-01-20') },
      ]);
      const res = await POST(makeFileReq('r.csv', H + 'Maria,Santos,1985-01-20,FEMALE,MARRIED,\n'));
      const { rows } = await res.json();
      expect(rows[0].issues).toEqual([
        expect.objectContaining({ field: '', type: 'DUPLICATE_EXISTING' }),
      ]);
    });
  });
});