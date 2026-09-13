// FILE: src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins plain class strings', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('drops falsy values', () => {
    expect(cn('px-2', false, undefined, null, '', 'py-4')).toBe('px-2 py-4');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('merges conflicting Tailwind utility classes, letting the last one win', () => {
    // tailwind-merge should resolve "p-2 p-4" down to just "p-4"
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('merges conflicting classes across array/object inputs', () => {
    expect(cn(['text-sm', 'text-lg'])).toBe('text-lg');
  });
});