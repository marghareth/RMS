// FILE: src/lib/route-permissions.test.ts
import { describe, it, expect } from 'vitest';
import { findRoutePermission, canAccessRoute } from './route-permissions';

describe('findRoutePermission', () => {
  it('matches an exact prefix path', () => {
    expect(findRoutePermission('/dashboard')).toBe('dashboard:read');
  });

  it('matches a nested path under a prefix', () => {
    expect(findRoutePermission('/residents/42')).toBe('residents:read');
    // Edit pages need :write under the Nov 2026 access policy.
    expect(findRoutePermission('/residents/42/edit')).toBe('residents:write');
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

  it('requires residents:write for registering and importing residents, but only :read to browse', () => {
    expect(findRoutePermission('/residents/import')).toBe('residents:write');
    expect(findRoutePermission('/residents/new')).toBe('residents:write');
    expect(findRoutePermission('/residents')).toBe('residents:read');
    expect(findRoutePermission('/residents/42')).toBe('residents:read');
  });

  it('lets write roles reach the import page and keeps read-only roles out', () => {
    for (const role of ['ADMIN', 'SECRETARY', 'ENCODER']) {
      expect(canAccessRoute(role, '/residents/import')).toBe(true);
    }
    // Captain is view-only under the Nov 2026 access policy.
    for (const role of ['CAPTAIN', 'KAGAWAD', 'BHW']) {
      expect(canAccessRoute(role, '/residents/import')).toBe(false);
      expect(canAccessRoute(role, '/residents')).toBe(true); // can still browse
    }
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
describe('access policy (Nov 2026): add/edit pages need :write', () => {
  const FORMS: [string, string][] = [
    ['/residents/new', 'residents:write'], ['/residents/import', 'residents:write'], ['/residents/42/edit', 'residents:write'],
    ['/households/new', 'households:write'], ['/households/7/edit', 'households:write'],
    ['/certificates/new', 'certificates:write'], ['/barangay-id/new', 'barangay_id:write'],
    ['/blotter/new', 'blotter:write'],
    ['/health/new', 'health:write'], ['/health/3/edit', 'health:write'], ['/health/vaccinations/new', 'health:write'],
    ['/equipment/new', 'equipment:write'], ['/equipment/5/edit', 'equipment:write'], ['/equipment/borrow', 'equipment:write'], ['/equipment/return', 'equipment:write'],
    ['/financial/new', 'financial:write'], ['/meetings/new', 'meetings:write'],
    ['/officials/new', 'officials:write'], ['/officials/2/edit', 'officials:write'],
    ['/admin/users/new', 'users:write'], ['/admin/users/9/edit', 'users:write'],
  ];

  it.each(FORMS)('%s needs %s', (path, perm) => {
    expect(findRoutePermission(path)).toBe(perm);
  });

  it('keeps detail and print pages at :read', () => {
    expect(findRoutePermission('/residents/42')).toBe('residents:read');
    expect(findRoutePermission('/blotter/12/hearing')).toBe('blotter:read');
    expect(findRoutePermission('/health/3')).toBe('health:read');
    expect(findRoutePermission('/admin/users')).toBe('users:read');
  });

  it('does not treat look-alike paths as edit pages', () => {
    expect(findRoutePermission('/residents/42/editor')).toBe('residents:read');
    expect(findRoutePermission('/residents/edit')).toBe('residents:read');
  });

  it('sends view-only roles away from every form, but lets them browse', () => {
    for (const role of ['CAPTAIN', 'KAGAWAD']) {
      for (const [path] of FORMS) expect(canAccessRoute(role, path)).toBe(false);
      expect(canAccessRoute(role, '/residents')).toBe(true);
      expect(canAccessRoute(role, '/blotter/12/hearing')).toBe(true);
    }
  });

  it('lets Encoder and BHW open only their own forms', () => {
    expect(canAccessRoute('ENCODER', '/residents/new')).toBe(true);
    expect(canAccessRoute('ENCODER', '/certificates/new')).toBe(true);
    expect(canAccessRoute('ENCODER', '/health/new')).toBe(false);
    expect(canAccessRoute('ENCODER', '/blotter/new')).toBe(false);
    expect(canAccessRoute('BHW', '/health/new')).toBe(true);
    expect(canAccessRoute('BHW', '/health/vaccinations/new')).toBe(true);
    expect(canAccessRoute('BHW', '/residents/new')).toBe(false);
  });

  it('lets Admin and Secretary open every form', () => {
    for (const role of ['ADMIN', 'SECRETARY']) for (const [path] of FORMS) expect(canAccessRoute(role, path)).toBe(true);
  });
});