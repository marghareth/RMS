// FILE: src/lib/password-policy.test.ts
import { describe, it, expect, vi } from 'vitest';
import { passwordProblem, passwordRules, PASSWORD_MIN_LENGTH } from './password-policy';
import { resetBlockedReason } from './password-reset';
import { generateTemporaryPassword } from './weak-passwords';
import { passwordChangedSince } from './auth';

vi.mock('./db', () => ({ prisma: {} }));

describe('passwordProblem', () => {
  it('accepts 10+ characters with uppercase, lowercase, a number and a symbol', () => {
    expect(passwordProblem('Sampaguita-2026', 'bhw1')).toBeNull();
    expect(passwordProblem('Kalye#12ab', 'bhw1')).toBeNull(); // exactly 10
  });

  it(`rejects anything shorter than ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(passwordProblem('Ab1!xyz', 'bhw1')).toMatch(/at least 10/);
  });

  it('names every missing kind of character', () => {
    expect(passwordProblem('sampaguita2026', 'bhw1')).toBe('Add an uppercase letter and a symbol.');
    expect(passwordProblem('SAMPAGUITA-2026', 'bhw1')).toBe('Add a lowercase letter.');
    expect(passwordProblem('Sampaguita-x', 'bhw1')).toBe('Add a number.');
  });

  it('quietly rejects well-known weak passwords dressed up to pass the rules', () => {
    expect(passwordProblem('Barangay123!', 'bhw1')).toMatch(/easy to guess/);
    expect(passwordProblem('Password123!', 'bhw1')).toMatch(/easy to guess/);
  });

  it('rejects a password that contains the username', () => {
    expect(passwordProblem('Encoder1-is-me', 'encoder1')).toMatch(/username/);
  });

  it('shows exactly the five rules the barangay asked for', () => {
    expect(passwordRules('').map((r) => r.id)).toEqual(['length', 'upper', 'lower', 'number', 'symbol']);
    expect(passwordRules('').every((r) => !r.ok)).toBe(true);
  });
});

describe('generateTemporaryPassword', () => {
  it('looks like Mango-River-4827 and passes the password rules', () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTemporaryPassword();
      expect(p).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
      expect(passwordProblem(p)).toBeNull();
    }
  });
});

describe('resetBlockedReason', () => {
  const target = { id: 5, username: 'encoder1', role: 'ENCODER', is_active: true };

  it('lets an Admin or Secretary reset a regular account', () => {
    expect(resetBlockedReason({ id: 1, role: 'ADMIN' }, target)).toBeNull();
    expect(resetBlockedReason({ id: 3, role: 'SECRETARY' }, target)).toBeNull();
  });

  it('never lets you reset your own account this way', () => {
    expect(resetBlockedReason({ id: 5, role: 'ADMIN' }, target)?.code).toBe('OWN_ACCOUNT');
  });

  it("only lets an Admin reset an Admin's password", () => {
    const admin = { id: 1, username: 'admin', role: 'ADMIN', is_active: true };
    expect(resetBlockedReason({ id: 3, role: 'SECRETARY' }, admin)?.code).toBe('ADMIN_ONLY');
    expect(resetBlockedReason({ id: 2, role: 'ADMIN' }, admin)).toBeNull();
  });

  it('refuses a deactivated account', () => {
    expect(resetBlockedReason({ id: 1, role: 'ADMIN' }, { ...target, is_active: false })?.code).toBe('INACTIVE');
  });
});

describe('passwordChangedSince', () => {
  it('ends a session that signed in before the password changed', () => {
    expect(passwordChangedSince(new Date(2000), 1000)).toBe(true);
  });

  it('keeps a session that signed in after the last change', () => {
    expect(passwordChangedSince(new Date(1000), 1000)).toBe(false);
    expect(passwordChangedSince(new Date(1000), 2000)).toBe(false);
  });

  it('treats a token from before this check existed as out of date', () => {
    expect(passwordChangedSince(new Date(1000), undefined)).toBe(true);
  });
});