import { useState, useEffect, useCallback } from "react";

/**
 * Shared data-fetching hook for the /reports/* pages.
 *
 * Handles the "fetch on mount / refetch on filter change" pattern that was
 * duplicated across blotter, certificates, inventory, and financial report
 * pages: null-until-loaded state, a loading flag, and a stable loader
 * function safe to put in a useEffect dependency array.
 *
 * Usage:
 *   const { data, loading, reload } = useReportData<FinancialReportData>(
 *     "financial",
 *     { year, month }
 *   );
 *
 * `params` values are appended as query params; falsy values (undefined,
 * null, "") are omitted so callers don't need to build URLSearchParams
 * themselves.
 */
export function useReportData<T>(
  reportType: string,
  params: Record<string, string | undefined> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Serialize params to a stable string so the callback identity only
  // changes when the actual filter values change, not on every render.
  const paramsKey = JSON.stringify(params);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams({ type: reportType });
      const parsed: Record<string, string | undefined> = JSON.parse(paramsKey);
      for (const [key, value] of Object.entries(parsed)) {
        if (value) search.set(key, value);
      }
      const res = await fetch(`/api/reports?${search}`);
      if (!res.ok) throw new Error(`Failed to load ${reportType} report`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [reportType, paramsKey]);

  useEffect(() => {
    // Fetching-on-mount/param-change to synchronize local state with the
    // /api/reports endpoint (an external system) — the documented exception
    // case for this rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}