// FILE: src/lib/mfa.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { matchTotpStep, verifyTotp } from './mfa';

// RFC 6238 Appendix B reference: ASCII "12345678901234567890" (base32
// below) at T = 59 s is step 1, code 94287082 → last 6 digits 287082.
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const CODE = '287082';

describe('TOTP', () => {
  afterEach(() => vi.useRealTimers());

  it('matches the RFC 6238 reference vector and reports its step', () => {
    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    expect(matchTotpStep(SECRET, CODE)).toBe(1);
    expect(verifyTotp(SECRET, CODE)).toBe(true);
  });

  it('rejects a code whose step was already used (replay)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    expect(matchTotpStep(SECRET, CODE, 1)).toBeNull();
    expect(verifyTotp(SECRET, CODE, 1)).toBe(false);
  });

  it('still accepts the code when only an older step was used', () => {
    vi.useFakeTimers();
    vi.setSystemTime(59_000);
    expect(matchTotpStep(SECRET, CODE, 0)).toBe(1);
  });
});
