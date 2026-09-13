// FILE: src/lib/audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db', () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

import { logAudit } from './audit';
import { prisma } from './db';

describe('logAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an audit log row with the given fields', async () => {
    await logAudit({
      user_id: 1,
      action: 'CREATE',
      table_affected: 'Resident',
      record_id: 42,
      details: 'Created resident Juan Dela Cruz',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        user_id: 1,
        action: 'CREATE',
        table_affected: 'Resident',
        record_id: 42,
        details: 'Created resident Juan Dela Cruz',
      },
    });
  });

  it('allows record_id and details to be omitted', async () => {
    await logAudit({ user_id: 2, action: 'LOGIN', table_affected: 'User' });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        user_id: 2,
        action: 'LOGIN',
        table_affected: 'User',
        record_id: undefined,
        details: undefined,
      },
    });
  });
});