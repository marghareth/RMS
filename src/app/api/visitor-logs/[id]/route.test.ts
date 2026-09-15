// FILE: src/app/api/visitor-logs/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { visitorLog: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/visitor-logs/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/visitor-logs/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.visitorLog.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/visitor-logs/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/visitor-logs/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears contact to null when explicitly set, leaves it alone when omitted', async () => {
    (prisma.visitorLog.update as any).mockResolvedValue({ id: 1, visitor_name: 'Juan' });
    await PATCH(makeReq({ contact: null }), makeContext('1'));
    let updateArgs = (prisma.visitorLog.update as any).mock.calls[0][0];
    expect(updateArgs.data.contact).toBeNull();

    vi.clearAllMocks();
    (prisma.visitorLog.update as any).mockResolvedValue({ id: 1, visitor_name: 'Juan' });
    await PATCH(makeReq({ purpose: 'Updated purpose' }), makeContext('1'));
    updateArgs = (prisma.visitorLog.update as any).mock.calls[0][0];
    expect(updateArgs.data.contact).toBeUndefined();
  });

  it('logs an audit entry', async () => {
    (prisma.visitorLog.update as any).mockResolvedValue({ id: 1, visitor_name: 'Juan' });
    await PATCH(makeReq({ purpose: 'Updated purpose' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'VisitorLog', record_id: 1 })
    );
  });
});

describe('DELETE /api/visitor-logs/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the entry and logs an audit entry naming the visitor', async () => {
    (prisma.visitorLog.delete as any).mockResolvedValue({ id: 1, visitor_name: 'Juan Dela Cruz' });
    const res = await DELETE(new NextRequest('http://localhost/api/visitor-logs/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        table_affected: 'VisitorLog',
        record_id: 1,
        details: expect.stringContaining('Juan Dela Cruz'),
      })
    );
  });
});