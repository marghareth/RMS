// FILE: src/app/api/residents/duplicate-check/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => ({ prisma: { resident: { findMany: vi.fn() } } }));
vi.mock('@/lib/session', () => ({ requirePermission: vi.fn() }));

const member = (over: Record<string, unknown> = {}) => ({
  fname: 'Juan', lname: 'Dela Cruz', birthdate: '1990-05-05', ...over,
});
const req = (members: unknown) =>
  new NextRequest('http://localhost/api/residents/duplicate-check', {
    method: 'POST',
    body: JSON.stringify({ members }),
  });
const onFile = (over: Record<string, unknown> = {}) => ({
  id: 12, fname: 'Juan', lname: 'Dela Cruz', mname: null, name_extension: null,
  birthdate: new Date('1990-05-05'), ...over,
});

describe('POST /api/residents/duplicate-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
    (prisma.resident.findMany as any).mockResolvedValue([]);
  });

  it('reports nothing for brand-new people, and writes nothing', async () => {
    const res = await POST(req([member()]));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ hasExact: false, hasPossible: false });
    expect(body.results[0]).toEqual({ index: 0, exact: null, possible: [], batch: [] });
  });

  it('reports an exact match with an existing resident', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([onFile()]);
    const body = await (await POST(req([member()]))).json();
    expect(body.hasExact).toBe(true);
    expect(body.results[0].exact).toMatchObject({ id: 12, level: 'EXACT' });
  });

  it('reports near matches with an existing resident as possible, not exact', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([onFile({ fname: 'Juam' })]);
    const body = await (await POST(req([member()]))).json();
    expect(body.hasExact).toBe(false);
    expect(body.hasPossible).toBe(true);
    expect(body.results[0].possible[0]).toMatchObject({ id: 12, reason: 'NAME_TYPO' });
  });

  it('flags the same person entered twice in one household (exact, within the batch)', async () => {
    const body = await (await POST(req([member(), member({ fname: 'JUAN' })]))).json();
    expect(body.hasExact).toBe(true);
    expect(body.results[0].batch).toEqual([]);
    expect(body.results[1].batch[0]).toMatchObject({ with: 0, level: 'EXACT' });
  });

  it('flags near-identical household members as possible (e.g. twins with similar names)', async () => {
    const body = await (await POST(req([member({ fname: 'Marco' }), member({ fname: 'Marc' })]))).json();
    expect(body.hasExact).toBe(false);
    expect(body.hasPossible).toBe(true);
    expect(body.results[1].batch[0]).toMatchObject({ with: 0, level: 'POSSIBLE', reason: 'NAME_TYPO' });
  });

  it('uses ONE database query for the whole batch', async () => {
    await POST(req([member(), member({ fname: 'Ana' }), member({ fname: 'Ben' })]));
    expect(prisma.resident.findMany).toHaveBeenCalledTimes(1);
    const { where } = (prisma.resident.findMany as any).mock.calls[0][0];
    expect(where.OR).toHaveLength(3); // one candidate filter per member
    for (const clause of where.OR) expect(clause.OR).toHaveLength(2); // birthdate OR first+last name
  });

  it('validates input: needs 1–50 members with valid names/birthdates', async () => {
    expect((await POST(req([]))).status).toBe(400);
    expect((await POST(req(Array.from({ length: 51 }, () => member())))).status).toBe(400);
    expect((await POST(req([member({ birthdate: '2087-01-01' })]))).status).toBe(400);
    expect((await POST(req([member({ fname: 'R2D2' })]))).status).toBe(400);
  });

  it('requires residents:write', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Forbidden', status: 403 });
    expect((await POST(req([member()]))).status).toBe(403);
    expect(prisma.resident.findMany).not.toHaveBeenCalled();
  });
});