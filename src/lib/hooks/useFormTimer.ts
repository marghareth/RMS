// FILE: src/lib/hooks/useFormTimer.ts
//
// How long a request form has been open, for the Processing Time report
// (src/lib/process-timing.ts). Uses performance.now(), which can't be
// thrown off by the computer's clock. Call seconds() when submitting and
// send it as `form_seconds`; call restart() when the form is cleared for
// the next person.
"use client";

import { useCallback, useEffect, useRef } from "react";

export function useFormTimer() {
  const started = useRef<number | null>(null);
  useEffect(() => {
    started.current = performance.now();
  }, []);
  const seconds = useCallback(
    () => (started.current === null ? 0 : Math.round((performance.now() - started.current) / 100) / 10),
    []
  );
  const restart = useCallback(() => {
    started.current = performance.now();
  }, []);
  return { seconds, restart };
}