// FILE: src/lib/weak-passwords.test.ts
import { describe, it, expect } from 'vitest';
import { LEGACY_SEED_PASSWORDS, generateStrongPassword, weakPasswordCandidates } from './weak-passwords';

describe('weakPasswordCandidates', () => {
  it('includes every password the old seed created', () => {
    const c = weakPasswordCandidates('someone');
    for (const pw of Object.values(LEGACY_SEED_PASSWORDS)) expect(c).toContain(pw);
  });

  it('covers the "<name without digits>123" pattern the old seed used for kagawad1', () => {
    expect(weakPasswordCandidates('kagawad1')).toContain('kagawad123');
    expect(weakPasswordCandidates('tanod7')).toContain('tanod123');
  });

  it('includes the username itself and common weak passwords', () => {
    expect(weakPasswordCandidates('maria')).toEqual(expect.arrayContaining(['maria', 'maria123', 'password', 'barangay123']));
  });

  it('never contains duplicates or an empty string', () => {
    const c = weakPasswordCandidates('123');
    expect(new Set(c).size).toBe(c.length);
    expect(c).not.toContain('');
  });
});

describe('generateStrongPassword', () => {
  it('produces four groups of four characters', () => {
    expect(generateStrongPassword()).toMatch(/^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);
  });

  it('avoids look-alike characters', () => {
    for (let i = 0; i < 200; i++) expect(generateStrongPassword()).not.toMatch(/[0O1lI]/);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateStrongPassword()));
    expect(seen.size).toBe(500);
  });

  it('is never one of the weak candidates', () => {
    expect(weakPasswordCandidates('admin')).not.toContain(generateStrongPassword());
  });
});