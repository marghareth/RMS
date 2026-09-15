// FILE: src/app/api/resident-sectors/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { residentSector: { delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

describe('DELETE /api/resident-sectors/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the tag and logs an audit entry naming the sector', async () => {
    (prisma.residentSector.delete as any).mockResolvedValue({ id: 1, sector_type: 'YOUTH' });
    const res = await DELETE(new NextRequest('http://localhost/api/resident-sectors/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        table_affected: 'ResidentSector',
        record_id: 1,
        details: expect.stringContaining('YOUTH'),
      })
    );
  });
});