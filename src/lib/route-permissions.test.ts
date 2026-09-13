// FILE: src/lib/route-permissions.test.ts
import { describe, it, expect } from 'vitest';
import { findRoutePermission } from './route-permissions';

describe('findRoutePermission', () => {
  it('matches an exact prefix path', () => {
    expect(findRoutePermission('/dashboard')).toBe('dashboard:read');
  });

  it('matches a nested path under a prefix', () => {
    expect(findRoutePermission('/residents/42')).toBe('residents:read');
    expect(findRoutePermission('/residents/42/edit')).toBe('residents:read');
  });

  it('picks the most specific (longest) matching prefix', () => {
    expect(findRoutePermission('/certificates/templates')).toBe('certificates:read');
    expect(findRoutePermission('/certificates/templates/anything')).toBe('certificates:read');
    // A plain /certificates/123 still resolves to certificates:read too,
    // but via the shorter /certificates entry, not /certificates/templates.
    expect(findRoutePermission('/certificates/123')).toBe('certificates:read');
  });

  it('resolves the finance overview fan-out to an array of permissions', () => {
    const perm = findRoutePermission('/finance/overview');
    expect(Array.isArray(perm)).toBe(true);
    expect(perm).toEqual([
      'fund-sources:read',
      'appropriations:read',
      'revenues:read',
      'disbursements:read',
    ]);
  });

  it('distinguishes /finance/overview from other /finance/* routes', () => {
    expect(findRoutePermission('/finance/revenues')).toBe('revenues:read');
    expect(findRoutePermission('/finance/appropriations')).toBe('appropriations:read');
    expect(findRoutePermission('/finance/fund-sources')).toBe('fund-sources:read');
    expect(findRoutePermission('/finance/disbursements')).toBe('disbursements:read');
  });

  it('distinguishes /admin/users, /admin/puroks, /admin/audit-logs, /admin/backup, /admin/settings', () => {
    expect(findRoutePermission('/admin/users')).toBe('users:read');
    expect(findRoutePermission('/admin/puroks')).toBe('residents:read');
    expect(findRoutePermission('/admin/audit-logs')).toBe('audit-logs:read');
    expect(findRoutePermission('/admin/backup')).toBe('backup:write');
    expect(findRoutePermission('/admin/settings')).toBe('settings:read');
  });

  it('does not match a path that merely shares a prefix as a substring (no boundary)', () => {
    // "/financial-report" should NOT match "/financial" as a directory
    // prefix, since findRoutePermission requires an exact match or a "/"
    // boundary right after the prefix.
    expect(findRoutePermission('/financial-report')).toBeNull();
  });

  it('still matches /financial itself and its sub-paths', () => {
    expect(findRoutePermission('/financial')).toBe('financial:read');
    expect(findRoutePermission('/financial/123')).toBe('financial:read');
  });

  it('returns null for unlisted routes like /login or /access-denied', () => {
    expect(findRoutePermission('/login')).toBeNull();
    expect(findRoutePermission('/access-denied')).toBeNull();
    expect(findRoutePermission('/')).toBeNull();
  });
});