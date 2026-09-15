// FILE: src/app/api/dashboard-preferences/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    dashboardPreference: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'BHW' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/dashboard-preferences', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('GET /api/dashboard-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'BHW' } } });
  });

  it('returns role defaults with hasCustomizations: false when the user has no saved overrides', async () => {
    (prisma.dashboardPreference.findMany as any).mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/dashboard-preferences'));
    const body = await res.json();

    expect(body.hasCustomizations).toBe(false);
    // BHW's role default turns kpi_document_requests off (see dashboard-defaults.ts)
    expect(body.preferences.kpi_document_requests).toBe(false);
    expect(body.preferences).toEqual(body.defaults);
  });

  it('layers a saved override on top of the role default', async () => {
    (prisma.dashboardPreference.findMany as any).mockResolvedValue([
      { widget_key: 'kpi_document_requests', is_enabled: true },
    ]);
    const res = await GET(new NextRequest('http://localhost/api/dashboard-preferences'));
    const body = await res.json();

    expect(body.hasCustomizations).toBe(true);
    expect(body.preferences.kpi_document_requests).toBe(true); // overridden
    expect(body.defaults.kpi_document_requests).toBe(false); // default unchanged
  });

  it('ignores a saved row for a widget_key that no longer exists', async () => {
    (prisma.dashboardPreference.findMany as any).mockResolvedValue([
      { widget_key: 'kpi_some_removed_widget', is_enabled: true },
      { widget_key: 'kpi_residents', is_enabled: false },
    ]);
    const res = await GET(new NextRequest('http://localhost/api/dashboard-preferences'));
    const body = await res.json();

    expect(body.preferences).not.toHaveProperty('kpi_some_removed_widget');
    expect(body.preferences.kpi_residents).toBe(false);
  });
});

describe('PATCH /api/dashboard-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'BHW' } } });
    (prisma.dashboardPreference.findMany as any).mockResolvedValue([]);
  });

  it('upserts every preference in the request', async () => {
    (prisma.dashboardPreference.upsert as any).mockResolvedValue({});
    await PATCH(makeReq({ preferences: [{ widget_key: 'kpi_residents', is_enabled: false }] }));

    expect(prisma.dashboardPreference.upsert).toHaveBeenCalledWith({
      where: { user_id_widget_key: { user_id: 1, widget_key: 'kpi_residents' } },
      update: { is_enabled: false },
      create: { user_id: 1, widget_key: 'kpi_residents', is_enabled: false },
    });
  });

  it('logs an audit entry with the count of widgets changed', async () => {
    (prisma.dashboardPreference.upsert as any).mockResolvedValue({});
    await PATCH(
      makeReq({
        preferences: [
          { widget_key: 'kpi_residents', is_enabled: false },
          { widget_key: 'quick_actions', is_enabled: false },
        ],
      })
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'DashboardPreference', record_id: 1 })
    );
  });

  it('rejects an unknown widget_key (schema validation)', async () => {
    const res = await PATCH(makeReq({ preferences: [{ widget_key: 'not_a_real_widget', is_enabled: true }] }));
    expect(res.status).toBe(400);
    expect(prisma.dashboardPreference.upsert).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/dashboard-preferences (reset to role defaults)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'BHW' } } });
  });

  it('wipes saved overrides and returns pure role defaults', async () => {
    (prisma.dashboardPreference.deleteMany as any).mockResolvedValue({ count: 3 });

    const res = await DELETE(new NextRequest('http://localhost/api/dashboard-preferences'));
    const body = await res.json();

    expect(prisma.dashboardPreference.deleteMany).toHaveBeenCalledWith({ where: { user_id: 1 } });
    expect(body.hasCustomizations).toBe(false);
    expect(body.preferences).toEqual(body.defaults);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', table_affected: 'DashboardPreference' }));
  });
});