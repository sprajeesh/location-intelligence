/**
 * Feature flag for the map corrections UI (add a missing place, report a place as closed).
 *
 * Off means no "Report a missing place" button and no popup action. Read at call time so
 * tests can toggle it; Next.js inlines NEXT_PUBLIC_* values at build time.
 */
export function isMapCorrectionsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MAP_CORRECTIONS_ENABLED === "true";
}
