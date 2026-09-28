// FILE: src/lib/hooks/useBarangayInfo.ts
//
// Client-side counterpart to src/lib/barangay-info.ts: fetches the real
// barangay details + active captain once per page load. Before the fetch
// resolves (or if it fails) it returns empty strings rather than another
// barangay's name, so a preview can never show made-up data.
import { useEffect, useState } from "react";

export interface BarangayContext {
  barangay: { name: string; city: string; province: string; region: string };
  captain: { name: string; position: string; term: string };
}

const EMPTY: BarangayContext = {
  barangay: { name: "", city: "", province: "", region: "" },
  captain: { name: "", position: "Punong Barangay", term: "" },
};

export function useBarangayInfo(): BarangayContext & { loaded: boolean } {
  const [ctx, setCtx] = useState<BarangayContext>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/barangay-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (ignore) return;
        if (json) setCtx(json);
        setLoaded(true);
      })
      .catch(() => {
        if (!ignore) setLoaded(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { ...ctx, loaded };
}