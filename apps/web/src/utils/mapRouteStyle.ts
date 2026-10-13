import type { PathOptions } from "leaflet";
import type { RouteTransportMode } from "@/types/api";

/**
 * Polyline style for the active route. Colour varies by transport mode; walking
 * is drawn as a dotted line so it reads differently from the solid driving and
 * cycling routes.
 */
export function routeStyleForMode(mode: RouteTransportMode): PathOptions {
  const isWalking = mode === "walking";
  return {
    color:
      mode === "walking"
        ? "rgb(var(--color-success-500))"
        : mode === "cycling"
          ? "rgb(var(--color-warning-500))"
          : "rgb(var(--color-primary-500))",
    weight: isWalking ? 6 : 12,
    opacity: 0.75,
    dashArray: isWalking ? "1, 15" : undefined,
    lineCap: isWalking ? "round" : undefined,
  };
}
