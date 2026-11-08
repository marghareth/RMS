// FILE: src/app/(dashboard)/health/vaccinations/page.tsx
//
// The sidebar's "Vaccinations" link opens this address. It used to hold an
// older copy of the Add vaccination form (old design, and without the
// "not before birth / not in the future" date check). It now shows the one
// form at /health/vaccinations/new, so the two can't drift apart again.
export { default } from "./new/page";