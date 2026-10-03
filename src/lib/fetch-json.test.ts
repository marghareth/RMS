// FILE: src/lib/fetch-json.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchJson, runWithConcurrency } from './fetch-json';

const noSleep = async () => {};
const respond = (status: number, body: unknown, extra: Partial<Response> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'Status text',
    redirected: false,
    url: 'http://localhost/api/x',
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected token <');
      return body;
    },
    ...extra,
  }) as unknown as Response;

describe('fetchJson', () => {
  it('returns the parsed body on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(200, { totalResidents: 22 }));
    expect(await fetchJson('/api/dashboard', { fetchImpl })).toEqual({ ok: true, data: { totalResidents: 22 } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports a 403 as a failure with the server message — never as empty data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(403, { error: 'MFA_SETUP_REQUIRED', message: 'Two-factor authentication must be enabled.' }));
    const r = await fetchJson('/api/dashboard', { fetchImpl, sleep: noSleep });
    expect(r).toEqual({ ok: false, status: 403, detail: 'Two-factor authentication must be enabled.' });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // not transient: no retry
  });

  it('does not retry a plain 500 or a 401', async () => {
    for (const status of [500, 401]) {
      const fetchImpl = vi.fn().mockResolvedValue(respond(status, { error: 'nope' }));
      const r = await fetchJson('/x', { fetchImpl, sleep: noSleep });
      expect(r.ok).toBe(false);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it('retries once on 503 (database busy/unreachable) and succeeds if the retry works', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(respond(503, { error: 'DATABASE_UNAVAILABLE', message: 'The database is currently unreachable.' }))
      .mockResolvedValueOnce(respond(200, { ok: 1 }));
    const sleep = vi.fn(noSleep);
    const r = await fetchJson('/x', { fetchImpl, sleep, retryDelayMs: 50 });
    expect(r).toEqual({ ok: true, data: { ok: 1 } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(50);
  });

  it('gives up after the retry and returns the 503 reason', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(503, { message: 'The database is currently unreachable.' }));
    const r = await fetchJson('/x', { fetchImpl, sleep: noSleep });
    expect(r).toEqual({ ok: false, status: 503, detail: 'The database is currently unreachable.' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries on a network error, then reports it readably', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await fetchJson('/x', { fetchImpl, sleep: noSleep });
    expect(r).toMatchObject({ ok: false, status: null });
    expect((r as { detail: string }).detail).toMatch(/reach the server/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('detects an expired session (redirect to /login HTML) instead of crashing on res.json()', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(200, undefined, { redirected: true, url: 'http://localhost/login?callbackUrl=%2Freports' }));
    const r = await fetchJson('/api/dashboard', { fetchImpl, sleep: noSleep });
    expect(r).toMatchObject({ ok: false, status: 401 });
    expect((r as { detail: string }).detail).toMatch(/session has expired/);
  });

  it('treats a 200 with a non-JSON body as a failure', async () => {
    const r = await fetchJson('/x', { fetchImpl: vi.fn().mockResolvedValue(respond(200, undefined)), sleep: noSleep });
    expect(r).toMatchObject({ ok: false, status: 200, detail: 'The server sent an unexpected response.' });
  });

  it('can be configured not to retry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respond(503, {}));
    await fetchJson('/x', { fetchImpl, retries: 0, sleep: noSleep });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('runWithConcurrency', () => {
  it('never runs more than `limit` tasks at once, and keeps result order', async () => {
    let active = 0;
    let peak = 0;
    const task = (n: number) => async () => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n;
    };
    const out = await runWithConcurrency([1, 2, 3, 4, 5, 6, 7].map(task), 3);
    expect(out).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it('handles an empty list and a limit larger than the list', async () => {
    expect(await runWithConcurrency([], 3)).toEqual([]);
    expect(await runWithConcurrency([async () => 'a'], 10)).toEqual(['a']);
  });

  it('still runs the remaining tasks if one rejects, then surfaces the error', async () => {
    const ran: number[] = [];
    const tasks = [
      async () => { ran.push(1); },
      async () => { ran.push(2); throw new Error('boom'); },
      async () => { ran.push(3); },
    ];
    await expect(runWithConcurrency(tasks, 1)).rejects.toThrow('boom');
    expect(ran).toEqual([1, 2, 3]);
  });
});