// FILE: src/lib/password-change.test.ts
import { describe, it, expect } from 'vitest';
import { signedInBeforePasswordChange } from './password-change';

describe('signedInBeforePasswordChange', () => {
  const changedAt = new Date('2026-10-01T00:00:00Z');

  it('keeps sessions when the password was never changed', () => {
    expect(signedInBeforePasswordChange(1, null)).toBe(false);
  });

  it('ends sessions that started before the change', () => {
    expect(signedInBeforePasswordChange(changedAt.getTime() - 1, changedAt)).toBe(true);
  });

  it('keeps sessions started after the change', () => {
    expect(signedInBeforePasswordChange(changedAt.getTime() + 1, changedAt)).toBe(false);
  });

  it('treats sessions with no recorded sign-in time as old', () => {
    expect(signedInBeforePasswordChange(undefined, changedAt)).toBe(true);
  });
});
