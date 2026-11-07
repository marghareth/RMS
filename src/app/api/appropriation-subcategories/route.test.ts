// FILE: src/app/api/appropriation-subcategories/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from './route';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/session';
import { APPROPRIATION_SUBCATEGORY_DEFAULTS } from '@/lib/category-lists';

vi.mock('@/lib/db', () => {
  const systemSetting = { findMany: vi.fn(), upsert: vi.fn() };
  const prisma: any = { systemSetting };
  prisma.$transaction = vi.fn(async (fn: (tx: any) => unknown) => fn(prisma));
  return { prisma };
});
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

const put = (body: unknown) =>
  PUT(new NextRequest('http://localhost/api/appropriation-subcategories', { method: 'PUT', body: JSON.stringify(body) }));

describe('/api/appropriation-subcategories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET returns one list per class, defaults until saved', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([
      { key: 'list_appropriation_subcategories_mooe', value: '["Office Supplies","Internet"]' },
    ]);
    const body = await (await GET(new NextRequest('http://localhost/api/appropriation-subcategories'))).json();
    expect(body.MOOE).toEqual(['Office Supplies', 'Internet']);
    expect(body.PS).toEqual(APPROPRIATION_SUBCATEGORY_DEFAULTS.PS);
    expect(body.CO).toEqual(APPROPRIATION_SUBCATEGORY_DEFAULTS.CO);
    expect((requirePermission as any).mock.calls[0][0]).toBe('appropriations:read');
  });

  it('PUT saves the list for one class with appropriations:write', async () => {
    const res = await put({ category: 'CO', subcategories: ['Multi-purpose Hall', 'Streetlights'] });
    expect(res.status).toBe(200);
    expect((requirePermission as any).mock.calls[0][0]).toBe('appropriations:write');
    const upsert = (prisma.systemSetting.upsert as any).mock.calls[0][0];
    expect(upsert.where).toEqual({ key: 'list_appropriation_subcategories_co' });
  });

  it('PUT refuses a class other than PS, MOOE or CO', async () => {
    expect((await put({ category: 'SPA', subcategories: ['x'] })).status).toBe(400);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
});