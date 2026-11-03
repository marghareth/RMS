// FILE: src/app/api/users/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/db', () => {
  const prisma: any = { user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() } };
  // Interactive transaction: run the callback against the same mocked client.
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

import { requirePermission } from '@/lib/session';

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

    const res = await POST(makeReq({ username: 'jdelacruz', password: 'Longenough1!', role: 'ENCODER' }));
    expect(res.status).toBe(409);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('hashes the password before storing and never returns it', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 2, username: 'newuser', role: 'ENCODER' });

    const res = await POST(makeReq({ username: 'newuser', password: 'Longenough1!', role: 'ENCODER' }));
    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('Longenough1!', 10);

    const createArgs = (prisma.user.create as any).mock.calls[0][0];
    expect(createArgs.data.password_hash).toBe('hashed-password');
    expect(createArgs.data).not.toHaveProperty('password');
    const body = await res.json();
    expect(body).not.toHaveProperty('password_hash');
  });

  it('logs an audit entry with the assigned role', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 3, username: 'auditme', role: 'BHW' });

    await POST(makeReq({ username: 'auditme', password: 'Longenough1!', role: 'BHW' }));
    // Second arg is the transaction client: the audit row commits with the user row.
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'User', record_id: 3 }),
      expect.anything()
    );
  });

  it('rejects a password shorter than 8 characters before ever touching the database', async () => {
    const res = await POST(makeReq({ username: 'shortpw', password: 'short', role: 'ENCODER' }));
    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/users — passwords and Admin accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('makes a new account choose its own password at first sign-in', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 9, username: 'newuser', role: 'ENCODER' });
    await POST(makeReq({ username: 'newuser', password: 'Longenough1!', role: 'ENCODER' }));
    expect((prisma.user.create as any).mock.calls[0][0].data.must_change_password).toBe(true);
  });

  it("a Secretary can't create an Admin account", async () => {
    (requirePermission as any).mockResolvedValueOnce({ session: { user: { id: '3', role: 'SECRETARY' } } });
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ username: 'sneaky', password: 'Longenough1!', role: 'ADMIN' }));
    expect(res.status).toBe(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});