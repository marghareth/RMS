// FILE: src/app/api/residents/route.post.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => ({
  prisma: { resident: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() } },
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({ requirePermission: vi.fn() }));

const BODY = {
  fname: 'Juan',
  lname: 'Dela Cruz',
  birthdate: '1990-05-05',
  sex: 'MALE',
  civil_status: 'SINGLE',
};

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/residents', { method: 'POST', body: JSON.stringify(body) });
}

const onFile = (over: Record<string, unknown> = {}) => ({
  id: 12, fname: 'Juan', lname: 'Dela Cruz', mname: null, name_extension: null,
  birthdate: new Date('1990-05-05'), ...over,
});

describe('POST /api/residents — duplicate handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
    (prisma.resident.findMany as any).mockResolvedValue([]);
    (prisma.resident.create as any).mockResolvedValue({ id: 99, fname: 'Juan', lname: 'Dela Cruz' });
  });

  it('creates the resident (201) when nobody similar exists', async () => {
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(201);
    expect(prisma.resident.create).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ details: 'Created resident: Juan Dela Cruz' })
    );
  });

  it('pre-filters candidates by birthdate OR case-insensitive first+last name', async () => {
    await POST(makeReq(BODY));
    const { where } = (prisma.resident.findMany as any).mock.calls[0][0];
    expect(where.OR).toHaveLength(2);
    expect(where.OR[1]).toEqual({
      fname: { equals: 'Juan', mode: 'insensitive' },
      lname: { equals: 'Dela Cruz', mode: 'insensitive' },
    });
  });

  it('hard-blocks an exact duplicate with 409 DUPLICATE and returns the existing record', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([onFile()]);
    const res = await POST(makeReq(BODY));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe('DUPLICATE');
    expect(body.existing.id).toBe(12);
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('treats accent / case / punctuation variants as an exact duplicate', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([onFile({ fname: 'Juán', lname: 'DELA-CRUZ' })]);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('DUPLICATE');
  });

  it('does NOT let confirm_possible_duplicate override an exact duplicate', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([onFile()]);
    const res = await POST(makeReq({ ...BODY, confirm_possible_duplicate: true }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('DUPLICATE');
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('warns (409 POSSIBLE_DUPLICATE) on a near match and lists what it resembles', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([onFile({ fname: 'Dela Cruz', lname: 'Juan' })]);
    const res = await POST(makeReq(BODY));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('POSSIBLE_DUPLICATE');
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0]).toMatchObject({ id: 12, reason: 'SWAPPED_NAMES', level: 'POSSIBLE', birthdate: '1990-05-05' });
    expect(body.message).toContain('#12');
    expect(prisma.resident.create).not.toHaveBeenCalled();
  });

  it('saves a near match once the user confirms, records the override in the audit log, and does not persist the flag', async () => {
    // Juan vs Juam: one letter different, same birthdate -> NAME_TYPO warning
    (prisma.resident.findMany as any).mockResolvedValue([onFile({ fname: 'Juam' })]);

    const res = await POST(makeReq({ ...BODY, confirm_possible_duplicate: true }));
    expect(res.status).toBe(201);

    const data = (prisma.resident.create as any).mock.calls[0][0].data;
    expect(data).not.toHaveProperty('confirm_possible_duplicate');
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.stringContaining('confirmed possible duplicate of #12') })
    );
  });

  it('still validates the body (400) before any duplicate lookup', async () => {
    const res = await POST(makeReq({ ...BODY, birthdate: '2087-05-05' }));
    expect(res.status).toBe(400);
    expect(prisma.resident.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 without residents:write', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Forbidden', status: 403 });
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(403);
    expect(prisma.resident.findMany).not.toHaveBeenCalled();
  });
});