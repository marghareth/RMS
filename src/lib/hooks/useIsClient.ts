// FILE: src/lib/hooks/useIsClient.ts
//
// Tells a component whether it's safely past hydration and running in the
// browser — used before touching `document` (e.g. createPortal(...,
// document.body)) so the very first client render still matches the
// server-rendered output (both return false/null), then flips to true on
// the next tick.
//
// Deliberately NOT implemented as `useState(false)` + `useEffect(() =>
// setState(true), [])`: that's the classic pattern, but the
// react-hooks/set-state-in-effect lint rule flags calling setState
// synchronously inside an effect body as an unnecessary extra render pass.
// useSyncExternalStore is the mechanism React recommends for exactly this
// "differs between server and client, settles after hydration" case — no
// effect, no setState, so nothing for that rule to flag.
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false // server snapshot (and the snapshot used for the first client render, to match SSR output)
  );
}