// FILE: src/lib/db-errors.test.ts
import { describe, it, expect } from 'vitest';
import { describeDbError } from './db-errors';

describe('describeDbError', () => {
  it('extracts the informative line from a multi-line Prisma message', () => {
    const err = new Error(
      "\nInvalid `prisma.user.findUnique()` invocation in\nC:\\x\\chunk.js:657:169\n\n  654 const stale = ...\n→ 657   const fresh = await prisma.user.findUnique(\nCan't reach database server at `db.example.com:6543`\n\nPlease make sure your database server is running."
    );
    expect(describeDbError(err)).toBe("Can't reach database server at `db.example.com:6543`");
  });
  it('falls back to the last line, and handles non-Errors', () => {
    expect(describeDbError(new Error('first\nsecond'))).toBe('second');
    expect(describeDbError('plain string')).toBe('plain string');
    expect(describeDbError(undefined)).toBe('undefined');
  });
  it('truncates very long lines', () => {
    expect(describeDbError(new Error('connection ' + 'x'.repeat(500))).length).toBe(200);
  });
});