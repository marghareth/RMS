// FILE: src/app/api/certificates/route.process-now.test.ts
//
// "Process now" on POST /api/certificates (Nov 2026): skips Pending and
// saves the request as Processing — but only while nobody is waiting.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    resident: { findUnique: vi.fn() },
    certificate: { count: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

const WALK_IN = {
  certificate_type: 'RESIDENCY',
  purpose: 'School enrollment',
  flagged_manual: true,
  manual_name: 'Juan Dela Cruz',
  manual_address: 'Purok 1',
};

function post(body: unknown) {
  return POST(new NextRequest('http://localhost/api/certificates', { method: 'POST', body: JSON.stringify(body) }));
}

/** Every certificate.count call that filters on status (the queue check). */
function queueChecks() {
  return (prisma.certificate.count as any).mock.calls.filter((c: any[]) => c[0]?.where?.status);
}

describe('POST /api/certificates — process now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.certificate.findUnique as any).mockResolvedValue(null); // no number collisions
    (prisma.certificate.create as any).mockImplementation(async ({ data }: any) => ({ id: 9, ...data }));
  });

  it('saves as PROCESSING with processing_started_at equal to requested_at when the queue is empty', async () => {
    (prisma.certificate.count as any).mockResolvedValue(0);
    const res = await post({ ...WALK_IN, process_now: true });

    expect(res.status).toBe(201);
    const { data } = (prisma.certificate.create as any).mock.calls[0][0];
    expect(data.status).toBe('PROCESSING');
    expect(data.processing_started_at).toBeInstanceOf(Date);
    expect(data.requested_at).toBe(data.processing_started_at);
    expect(queueChecks()[0][0].where).toEqual({ status: 'PENDING' });
    expect((logAudit as any).mock.calls[0][0].details).toContain('processed right away');
  });

  it('409s with QUEUE_NOT_EMPTY and saves nothing when someone is waiting', async () => {
    (prisma.certificate.count as any).mockImplementation(async (args: any) => (args?.where?.status === 'PENDING' ? 2 : 0));
    const res = await post({ ...WALK_IN, process_now: true });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('QUEUE_NOT_EMPTY');
    expect(body.message).toContain('2 requests are already waiting');
    expect(prisma.certificate.create).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('files a normal request as PENDING and never checks the queue', async () => {
    (prisma.certificate.count as any).mockResolvedValue(5);
    const res = await post(WALK_IN);

    expect(res.status).toBe(201);
    const { data } = (prisma.certificate.create as any).mock.calls[0][0];
    expect(data.status).toBeUndefined(); // schema default: PENDING
    expect(data.processing_started_at).toBeUndefined();
    expect(queueChecks()).toHaveLength(0);
  });

  it('treats process_now: false like a normal request', async () => {
    (prisma.certificate.count as any).mockResolvedValue(0);
    await post({ ...WALK_IN, process_now: false });
    expect((prisma.certificate.create as any).mock.calls[0][0].data.status).toBeUndefined();
    expect(queueChecks()).toHaveLength(0);
  });

  it('still runs the residency check before skipping the queue', async () => {
    (prisma.certificate.count as any).mockResolvedValue(0);
    (prisma.resident.findUnique as any).mockResolvedValue({
      id: 5,
      residency_start_date: new Date(), // moved in today
      created_at: new Date(),
    });
    const res = await post({ resident_id: 5, certificate_type: 'RESIDENCY', purpose: 'x', process_now: true });

    expect(res.status).toBe(400);
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });
});