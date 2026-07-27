import { describe, it, expect } from 'vitest';
import { hasPermission } from './permission';

describe('hasPermission', () => {
  it('gives ADMIN access to everything via wildcard', () => {
    expect(hasPermission('ADMIN', 'residents:write')).toBe(true);
    expect(hasPermission('ADMIN', 'anything:whatever')).toBe(true);
  });

  it('lets CAPTAIN write residents', () => {
    expect(hasPermission('CAPTAIN', 'residents:write')).toBe(true);
  });

  it('lets KAGAWAD read but not write residents', () => {
    expect(hasPermission('KAGAWAD', 'residents:read')).toBe(true);
    expect(hasPermission('KAGAWAD', 'residents:write')).toBe(false);
  });

  it('lets BHW write health records', () => {
    expect(hasPermission('BHW', 'health:write')).toBe(true);
  });

  it('denies ENCODER access to financial records', () => {
    expect(hasPermission('ENCODER', 'financial:read')).toBe(false);
  });

  it('returns false for an unknown role', () => {
    expect(hasPermission('RANDOM_ROLE', 'residents:read')).toBe(false);
  });
});