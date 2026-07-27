import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock the database — no real Postgres connection needed
vi.mock('@/lib/db', () => ({
  prisma: {
    resident: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock auth so requirePermission() always succeeds in this test
vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
}));

describe('GET /api/residents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns residents with pagination info', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([
      { id: 1, fname: 'Juan', lname: 'Dela Cruz' },
    ]);
    (prisma.resident.count as any).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/residents?page=1&limit=20');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.residents).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it('filters by search term', async () => {
    (prisma.resident.findMany as any).mockResolvedValue([]);
    (prisma.resident.count as any).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/residents?search=Juan');
    await GET(req);

    // Confirm the search term actually made it into the Prisma query
    const callArgs = (prisma.resident.findMany as any).mock.calls[0][0];
    expect(JSON.stringify(callArgs.where)).toContain('Juan');
  });
});