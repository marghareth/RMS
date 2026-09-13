// FILE: src/lib/api-handler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// This sandbox has no network access to Prisma's engine-binary host, so
// `prisma generate` can't produce a real generated client here — without
// it, `@prisma/client`'s `Prisma` namespace is a pre-generate stub that's
// missing `PrismaClientKnownRequestError`/`PrismaClientValidationError`.
// Those two classes actually live in `@prisma/client/runtime/library`
// independent of generation (a real generated client just re-exports
// them), so we mock `@prisma/client` to expose the real classes the same
// way a fully generated client would. This keeps the test asserting real
// runtime behavior rather than working around a missing dependency.
vi.mock('@prisma/client', async () => {
  const lib = await import('@prisma/client/runtime/library');
  return {
    Prisma: {
      PrismaClientKnownRequestError: lib.PrismaClientKnownRequestError,
      PrismaClientValidationError: lib.PrismaClientValidationError,
    },
  };
});

const { Prisma } = await import('@prisma/client');
const { withErrorHandling, ApiError } = await import('./api-handler');

function makeReq(url = 'http://localhost/api/test', method = 'GET') {
  return new NextRequest(url, { method });
}

describe('withErrorHandling', () => {
  it('passes through a successful response unchanged', async () => {
    const handler = withErrorHandling(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('maps a ZodError to a 400 with field-level issues', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const handler = withErrorHandling(async () => {
      schema.parse({ name: '' });
      return NextResponse.json({});
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.issues.length).toBeGreaterThan(0);
    expect(body.issues[0].path).toBe('name');
  });

  it('maps a Prisma P2002 unique constraint violation to 409 DUPLICATE', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['username'] },
    });
    const handler = withErrorHandling(async () => {
      throw err;
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('DUPLICATE');
    expect(body.message).toContain('username');
  });

  it('maps a Prisma P2025 not-found error to 404 NOT_FOUND', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });
    const handler = withErrorHandling(async () => {
      throw err;
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('NOT_FOUND');
  });

  it('maps a Prisma P2003 foreign key violation to 400 INVALID_REFERENCE', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '6.19.3',
    });
    const handler = withErrorHandling(async () => {
      throw err;
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_REFERENCE');
  });

  it('maps an unrecognized Prisma error code to 400 DATABASE_ERROR', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Something else went wrong', {
      code: 'P9999',
      clientVersion: '6.19.3',
    });
    const handler = withErrorHandling(async () => {
      throw err;
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('DATABASE_ERROR');
  });

  it('maps a Prisma validation error to 400 VALIDATION_ERROR', async () => {
    const err = new Prisma.PrismaClientValidationError('Invalid `prisma.resident.create()` invocation', {
      clientVersion: '6.19.3',
    });
    const handler = withErrorHandling(async () => {
      throw err;
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('VALIDATION_ERROR');
  });

  it('maps a thrown ApiError to its declared status/code/message', async () => {
    const handler = withErrorHandling(async () => {
      throw new ApiError(404, 'NOT_FOUND', 'Resident not found');
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toBe('Resident not found');
  });

  it('falls back to a generic 500 for an unrecognized error', async () => {
    const handler = withErrorHandling(async () => {
      throw new Error('boom');
    });
    const res = await handler(makeReq());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('SERVER_ERROR');
  });
});