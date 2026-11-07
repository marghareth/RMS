// FILE: src/app/api/financial-categories/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';
import { FINANCIAL_CATEGORY_DEFAULTS } from '@/lib/category-lists';

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
  PUT(new NextRequest('http://localhost/api/financial-categories', { method: 'PUT', body: JSON.stringify(body) }));

describe('GET /api/financial-categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the defaults when nothing has been saved', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/financial-categories'));
    expect(await res.json()).toEqual(FINANCIAL_CATEGORY_DEFAULTS);
    expect((requirePermission as any).mock.calls[0][0]).toBe('financial:read');
  });

  it('returns a saved list in place of the default', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([
      { key: 'list_financial_income_categories', value: '["Rentals","Donations"]' },
    ]);
    const body = await (await GET(new NextRequest('http://localhost/api/financial-categories'))).json();
    expect(body.INCOME).toEqual(['Rentals', 'Donations']);
    expect(body.EXPENSE).toEqual(FINANCIAL_CATEGORY_DEFAULTS.EXPENSE);
  });
});

describe('PUT /api/financial-categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves the cleaned list for that type and logs it in the same transaction', async () => {
    const res = await put({ type: 'EXPENSE', categories: [' Fuel ', 'fuel', 'Tanod Allowance'] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 'EXPENSE', categories: ['Fuel', 'Tanod Allowance'] });

    const upsert = (prisma.systemSetting.upsert as any).mock.calls[0][0];
    expect(upsert.where).toEqual({ key: 'list_financial_expense_categories' });
    expect(JSON.parse(upsert.create.value)).toEqual(['Fuel', 'Tanod Allowance']);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect((logAudit as any).mock.calls[0][0]).toMatchObject({ action: 'UPDATE', table_affected: 'SystemSetting' });
  });

  it('needs financial:write', async () => {
    await put({ type: 'INCOME', categories: ['A'] });
    expect((requirePermission as any).mock.calls[0][0]).toBe('financial:write');
  });

  it('stops a role without permission', async () => {
    (requirePermission as any).mockResolvedValueOnce({ error: 'Forbidden', status: 403 });
    expect((await put({ type: 'INCOME', categories: ['A'] })).status).toBe(403);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it('400s on an empty list or an unknown type, without saving', async () => {
    expect((await put({ type: 'INCOME', categories: ['  '] })).status).toBe(400);
    expect((await put({ type: 'OTHER', categories: ['A'] })).status).toBe(400);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
});