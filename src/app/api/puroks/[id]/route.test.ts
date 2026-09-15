// FILE: src/app/api/puroks/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    purok: { update: vi.fn(), delete: vi.fn() },
    resident: { count: vi.fn() },
    household: { count: vi.fn() },
  },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/puroks/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('PATCH /api/puroks/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renames the purok', async () => {
    (prisma.purok.update as any).mockResolvedValue({ id: 1, name: 'Purok 1 (renamed)' });
    const res = await PATCH(makeReq({ name: 'Purok 1 (renamed)' }), makeContext('1'));
    expect(res.status).toBe(200);
    expect(prisma.purok.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Purok 1 (renamed)' } });
  });
});

describe('DELETE /api/puroks/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks deletion and reports both residents and households when both are linked', async () => {
    (prisma.resident.count as any).mockResolvedValue(12);
    (prisma.household.count as any).mockResolvedValue(3);

    const res = await DELETE(new NextRequest('http://localhost/api/puroks/1'), makeContext('1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('PUROK_IN_USE');
    expect(body.message).toContain('12 residents');
    expect(body.message).toContain('3 households');
    expect(prisma.purok.delete).not.toHaveBeenCalled();
  });

  it('uses singular wording for exactly 1 resident and 1 household', async () => {
    (prisma.resident.count as any).mockResolvedValue(1);
    (prisma.household.count as any).mockResolvedValue(1);

    const res = await DELETE(new NextRequest('http://localhost/api/puroks/1'), makeContext('1'));
    const body = await res.json();
    expect(body.message).toContain('1 resident');
    expect(body.message).not.toContain('1 residents');
    expect(body.message).toContain('1 household');
    expect(body.message).not.toContain('1 households');
  });

  it('mentions only residents when there are no linked households', async () => {
    (prisma.resident.count as any).mockResolvedValue(5);
    (prisma.household.count as any).mockResolvedValue(0);

    const res = await DELETE(new NextRequest('http://localhost/api/puroks/1'), makeContext('1'));
    const body = await res.json();
    expect(body.message).toContain('5 residents');
    expect(body.message).not.toContain('household');
  });

  it('allows deletion when there are no linked residents or households', async () => {
    (prisma.resident.count as any).mockResolvedValue(0);
    (prisma.household.count as any).mockResolvedValue(0);
    (prisma.purok.delete as any).mockResolvedValue({ id: 1 });

    const res = await DELETE(new NextRequest('http://localhost/api/puroks/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(prisma.purok.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});