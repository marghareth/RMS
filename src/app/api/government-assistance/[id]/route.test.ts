// FILE: src/app/api/government-assistance/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { governmentAssistance: { update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/government-assistance/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('PATCH /api/government-assistance/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears notes to null when explicitly set, leaves it alone when omitted', async () => {
    (prisma.governmentAssistance.update as any).mockResolvedValue({ id: 1, program_name: '4Ps' });
    await PATCH(makeReq({ notes: null }), makeContext('1'));
    let updateArgs = (prisma.governmentAssistance.update as any).mock.calls[0][0];
    expect(updateArgs.data.notes).toBeNull();

    vi.clearAllMocks();
    (prisma.governmentAssistance.update as any).mockResolvedValue({ id: 1, program_name: '4Ps' });
    await PATCH(makeReq({ program_name: '4Ps (renamed)' }), makeContext('1'));
    updateArgs = (prisma.governmentAssistance.update as any).mock.calls[0][0];
    expect(updateArgs.data.notes).toBeUndefined();
  });

  it('logs an audit entry', async () => {
    (prisma.governmentAssistance.update as any).mockResolvedValue({ id: 1, program_name: '4Ps' });
    await PATCH(makeReq({ program_name: '4Ps' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'GovernmentAssistance', record_id: 1 })
    );
  });
});

describe('DELETE /api/government-assistance/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the record and logs an audit entry naming the program', async () => {
    (prisma.governmentAssistance.delete as any).mockResolvedValue({ id: 1, program_name: '4Ps' });
    const res = await DELETE(new NextRequest('http://localhost/api/government-assistance/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        table_affected: 'GovernmentAssistance',
        details: expect.stringContaining('4Ps'),
      })
    );
  });
});