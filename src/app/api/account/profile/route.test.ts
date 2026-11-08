// FILE: src/app/api/account/profile/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requireAuth } from '@/lib/session';

vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({ requireAuth: vi.fn() }));

// The route ignores the request on GET, but withErrorHandling's type needs one.
const get = () => GET(new NextRequest('http://localhost/api/account/profile'));
const patch = (body: unknown) =>
  PATCH(new NextRequest('http://localhost/api/account/profile', { method: 'PATCH', body: JSON.stringify(body) }));

describe('/api/account/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as any).mockResolvedValue({ session: { user: { id: '7', username: 'secretary', role: 'SECRETARY' } } });
  });

  it('returns only the signed-in user’s own name and position', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ username: 'secretary', role: 'SECRETARY', full_name: 'Maria L. Santos', position: 'Barangay Secretary' });
    const res = await get();
    expect(await res.json()).toEqual({ username: 'secretary', role: 'SECRETARY', full_name: 'Maria L. Santos', position: 'Barangay Secretary' });
    expect((prisma.user.findUnique as any).mock.calls[0][0].where).toEqual({ id: 7 });
    expect(Object.keys((prisma.user.findUnique as any).mock.calls[0][0].select)).not.toContain('password_hash');
  });

  it('needs a signed-in user', async () => {
    (requireAuth as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    expect((await get()).status).toBe(401);
    expect((await patch({ full_name: 'X' })).status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('saves a trimmed name, clears an emptied position, and logs it', async () => {
    (prisma.user.update as any).mockResolvedValue({ username: 'secretary', role: 'SECRETARY', full_name: 'Maria L. Santos', position: null });
    const res = await patch({ full_name: '  Maria L. Santos ', position: '' });
    expect(res.status).toBe(200);
    expect((prisma.user.update as any).mock.calls[0][0]).toMatchObject({
      where: { id: 7 },
      data: { full_name: 'Maria L. Santos', position: null },
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', record_id: 7 }));
  });

  it('can’t be used to change anything else on the account', async () => {
    (prisma.user.update as any).mockResolvedValue({});
    await patch({ full_name: 'A', role: 'ADMIN', is_active: false });
    expect((prisma.user.update as any).mock.calls[0][0].data).toEqual({ full_name: 'A' });
  });

  it('refuses a name over 100 characters', async () => {
    const res = await patch({ full_name: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});