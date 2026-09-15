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
    expect(body.summary).toEqual({ total: 1, valid: 1, errors: 0 });
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
});