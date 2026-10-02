// FILE: src/app/api/residents/import/commit/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    purok: { findMany: vi.fn() },
    household: { findMany: vi.fn() },
    resident: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeReq(rows: unknown[], confirmed_rows?: number[]) {
  return new NextRequest('http://localhost/api/residents/import/commit', {
    method: 'POST',
    body: JSON.stringify({ rows, ...(confirmed_rows ? { confirmed_rows } : {}) }),
  });
}

// What the route's single "load every resident" query returns.
const existingResident = (over: Record<string, unknown> = {}) => ({
  id: 55, fname: 'Juan', lname: 'Dela Cruz', mname: null, name_extension: null,
  birthdate: new Date('1990-01-15'), ...over,
});

const VALID_ROW = {
  fname: 'Juan',
  lname: 'Dela Cruz',
  birthdate: '1990-01-15',
  sex: 'MALE',
  civil_status: 'SINGLE',
};

describe('POST /api/residents/import/commit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
    (prisma.purok.findMany as any).mockResolvedValue([]);
    (prisma.household.findMany as any).mockResolvedValue([]);
    (prisma.resident.findMany as any).mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await POST(makeReq([VALID_ROW]));
    expect(res.status).toBe(401);
  });

  it('rejects an empty rows array (schema validation)', async () => {
    const res = await POST(makeReq([]));
    expect(res.status).toBe(400);
  });

  it('creates a resident for a valid row and logs one audit entry', async () => {
    (prisma.resident.create as any).mockResolvedValue({ id: 100 });

    const res = await POST(makeReq([VALID_ROW]));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(1);
    expect(body.skipped).toEqual([]);

    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'Resident', record_id: 100 })
    );
  });

  it('skips (does not throw on) an invalid row and reports the reason', async () => {
    const res = await POST(makeReq([{ ...VALID_ROW, fname: '' }]));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(0);
    expect(body.skipped).toHaveLength(1);
    expect(body.skipped[0].rowNumber).toBe(1);
    expect(body.skipped[0].reason).toContain('fname');
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('re-checks for duplicates at commit time and skips a row that now matches an existing resident', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existingResident()]);

    const res = await POST(makeReq([VALID_ROW]));
    const body = await res.json();

    expect(body.created).toBe(0);
    expect(body.skipped[0].reason).toContain('id 55');
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('processes rows sequentially, not concurrently, and creates each independently', async () => {
    const callOrder: number[] = [];
    (prisma.resident.create as any).mockImplementation(async (args: any) => {
      callOrder.push(args.data.fname === 'Juan' ? 1 : 2);
      return { id: callOrder.length === 1 ? 100 : 101 };
    });

    const rowTwo = { ...VALID_ROW, fname: 'Maria', lname: 'Santos' };
    const res = await POST(makeReq([VALID_ROW, rowTwo]));
    const body = await res.json();

    expect(body.created).toBe(2);
    expect(callOrder).toEqual([1, 2]);
  });

  it('does not log an audit entry when every row was skipped', async () => {
    const res = await POST(makeReq([{ ...VALID_ROW, fname: '' }]));
    const body = await res.json();
    expect(body.created).toBe(0);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('mixes created and skipped rows correctly in one request', async () => {
    (prisma.resident.create as any).mockResolvedValue({ id: 200 });
    const badRow = { ...VALID_ROW, sex: 'INVALID' };

    const res = await POST(makeReq([VALID_ROW, badRow]));
    const body = await res.json();

    expect(body.created).toBe(1);
    expect(body.skipped).toHaveLength(1);
    expect(body.skipped[0].rowNumber).toBe(2);
  });

  it('also treats case/accent/spacing variants of an existing resident as an exact duplicate', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existingResident({ fname: 'José', lname: 'Dela-Cruz' })]);
    const res = await POST(makeReq([{ ...VALID_ROW, fname: 'JOSE', lname: 'dela cruz' }]));
    const body = await res.json();
    expect(body.created).toBe(0);
    expect(body.skipped[0].reason).toContain('id 55');
  });

  it('skips a POSSIBLE duplicate (e.g. swapped names) unless the row is confirmed', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existingResident()]);
    const swapped = { ...VALID_ROW, fname: 'Dela Cruz', lname: 'Juan' };

    const res = await POST(makeReq([swapped]));
    const body = await res.json();

    expect(body.created).toBe(0);
    expect(body.skipped[0].reason).toMatch(/Possible duplicate/);
    expect(body.skipped[0].reason).toMatch(/not confirmed/);
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('imports a POSSIBLE duplicate once its position is listed in confirmed_rows, and audits the override', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existingResident()]);
    (prisma.resident.create as any).mockResolvedValue({ id: 300 });
    const swapped = { ...VALID_ROW, fname: 'Dela Cruz', lname: 'Juan' };

    const res = await POST(makeReq([swapped], [0]));
    const body = await res.json();

    expect(body.created).toBe(1);
    expect(body.skipped).toEqual([]);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.stringContaining('confirming a possible duplicate (ids 300)') })
    );
  });

  it('never lets confirmed_rows override an EXACT duplicate', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([existingResident()]);
    const res = await POST(makeReq([VALID_ROW], [0]));
    const body = await res.json();
    expect(body.created).toBe(0);
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('catches a repeat of a row created earlier in the same batch', async () => {
    (prisma.resident.create as any).mockResolvedValue({ id: 400 });
    const res = await POST(makeReq([VALID_ROW, { ...VALID_ROW, fname: 'JUAN' }]));
    const body = await res.json();
    expect(body.created).toBe(1);
    expect(body.skipped).toHaveLength(1);
    expect(body.skipped[0].reason).toContain('id 400');
  });

  it('loads existing residents once, not once per row', async () => {
    (prisma.resident.create as any).mockResolvedValue({ id: 500 });
    await POST(makeReq([VALID_ROW, { ...VALID_ROW, fname: 'Maria', lname: 'Santos' }]));
    expect(prisma.resident.findMany).toHaveBeenCalledTimes(1);
  });
});