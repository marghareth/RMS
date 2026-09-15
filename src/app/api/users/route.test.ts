// FILE: src/app/api/users/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/db', () => ({
  prisma: { user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/users', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never selects password_hash', async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: 1, username: 'admin' }]);
    await GET(new NextRequest('http://localhost/api/users'));
    const selectArgs = (prisma.user.findMany as any).mock.calls[0][0].select;
    expect(selectArgs).not.toHaveProperty('password_hash');
  });
});

describe('POST /api/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a duplicate username with 409 without ever hashing a password', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1, username: 'jdelacruz' });

    const res = await POST(makeReq({ username: 'jdelacruz', password: 'longenough1', role: 'ENCODER' }));
    expect(res.status).toBe(409);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('hashes the password before storing and never returns it', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 2, username: 'newuser', role: 'ENCODER' });

    const res = await POST(makeReq({ username: 'newuser', password: 'longenough1', role: 'ENCODER' }));
    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('longenough1', 10);

    const createArgs = (prisma.user.create as any).mock.calls[0][0];
    expect(createArgs.data.password_hash).toBe('hashed-password');
    expect(createArgs.data).not.toHaveProperty('password');
    const body = await res.json();
    expect(body).not.toHaveProperty('password_hash');
  });

  it('logs an audit entry with the assigned role', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 3, username: 'auditme', role: 'BHW' });

    await POST(makeReq({ username: 'auditme', password: 'longenough1', role: 'BHW' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'User', record_id: 3 })
    );
  });

  it('rejects a password shorter than 8 characters before ever touching the database', async () => {
    const res = await POST(makeReq({ username: 'shortpw', password: 'short', role: 'ENCODER' }));
    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});