// FILE: src/lib/fetch-json.ts
//
// Resilient JSON fetching for pages that load several independent API
// responses at once (e.g. the Reports overview).
//
// Why: the Reports overview did `fetch(...)` then `res.json()` on seven
// endpoints and read fields like `data.totalResidents ?? 0` off whatever came
// back. When a request failed — 401/403/500/503 with an `{ error }` body, or a
// redirect to the login page — the field was simply missing, `?? 0` turned the
// failure into a perfectly believable "0 residents", and one unexpected body
// (`puroks.map is not a function`) aborted the whole load, leaving every card
// at 0 forever. A failure must be reported as a failure, never as a zero.
//
// Pure + dependency-injected (fetch and sleep can be swapped) so it is
// unit-testable and safe in the browser.

import { apiErrorMessage } from "@/lib/api-error";

export type FetchJsonResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; detail: string };

export interface FetchJsonOptions {
  fetchImpl?: typeof fetch;
  /** Extra attempts after the first, for TRANSIENT failures only. Default 1. */
  retries?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

// 502/503/504: the server or database was momentarily unavailable (e.g. a
// connection-pool timeout) — worth one more try. 4xx and 500 are not.
const TRANSIENT_STATUS = new Set([502, 503, 504]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Never throws: always resolves to ok:true with the parsed body, or ok:false with a readable reason. */
export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchJsonOptions = {}
): Promise<FetchJsonResult<T>> {
  const { fetchImpl = fetch, retries = 1, retryDelayMs = 800, sleep = defaultSleep } = opts;

  let last: FetchJsonResult<T> = { ok: false, status: null, detail: "Request failed." };

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(retryDelayMs);

    try {
      const res = await fetchImpl(url);

      // An expired session is answered by the middleware with a redirect to
      // the login page (HTML), not a JSON error.
      if (res.redirected && /\/login/.test(res.url)) {
        return { ok: false, status: 401, detail: "Your session has expired — please sign in again." };
      }

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* body wasn't JSON */
      }

      if (res.ok) {
        if (body !== null && typeof body === "object") return { ok: true, data: body as T };
        return { ok: false, status: res.status, detail: "The server sent an unexpected response." };
      }

      last = {
        ok: false,
        status: res.status,
        detail: apiErrorMessage(body as Parameters<typeof apiErrorMessage>[0], res.statusText || "Request failed"),
      };
      if (!TRANSIENT_STATUS.has(res.status)) return last;
    } catch {
      last = { ok: false, status: null, detail: "Couldn't reach the server — check your connection." };
    }
  }

  return last;
}

/**
 * Runs async tasks with at most `limit` in flight, preserving result order.
 * Used to avoid firing a dozen database-heavy requests at the same instant
 * (which can exhaust a small connection pool). Tasks are expected not to
 * reject (wrap with fetchJson); if one does, the rest still run and the
 * first rejection is rethrown at the end.
 */
export async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  let firstError: unknown;
  let failed = false;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = await tasks[i]();
      } catch (e) {
        if (!failed) { failed = true; firstError = e; }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker));
  if (failed) throw firstError;
  return results;
}