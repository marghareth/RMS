// FILE: src/lib/api-error.test.ts
import { describe, it, expect } from 'vitest';
import { apiErrorMessage, humanizeFieldPath } from './api-error';

describe('humanizeFieldPath', () => {
  it('title-cases snake_case and keeps only the last path segment', () => {
    expect(humanizeFieldPath('philsys_card_no')).toBe('Philsys Card No');
    expect(humanizeFieldPath('members.0.birthdate')).toBe('Birthdate');
  });
});

describe('apiErrorMessage', () => {
  it('lists every field issue for validation errors', () => {
    const msg = apiErrorMessage(
      {
        error: 'VALIDATION_ERROR',
        message: 'One or more fields are invalid.',
        issues: [
          { path: 'birthdate', message: 'cannot be in the future' },
          { path: 'mobile', message: 'must be a Philippine mobile number' },
        ],
      },
      'fallback'
    );
    expect(msg).toBe('Birthdate: cannot be in the future • Mobile: must be a Philippine mobile number');
  });
  it('falls back to message, then error, then the fallback', () => {
    expect(apiErrorMessage({ message: 'A resident already exists.' }, 'x')).toBe('A resident already exists.');
    expect(apiErrorMessage({ error: 'DUPLICATE' }, 'x')).toBe('DUPLICATE');
    expect(apiErrorMessage({}, 'Failed to save')).toBe('Failed to save');
    expect(apiErrorMessage(null, 'Failed to save')).toBe('Failed to save');
  });
});