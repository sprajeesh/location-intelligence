"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRoute } from "@/services/api";
import type { RouteTransportMode } from "@/types/api";

/**
 * Fetches route alternatives between two coordinates for the given transport mode.
 * Only fires when `enabled` is true and all coordinates are defined.
 * Results are cached for 5 minutes per unique (origin, destination, mode) combination.
 */
export function useRoute(
  fromLat: number | undefined,
  fromLon: number | undefined,
  toLat: number | undefined,
  toLon: number | undefined,
  mode: RouteTransportMode,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["route", fromLat, fromLon, toLat, toLon, mode],
    queryFn: () => fetchRoute(fromLat!, fromLon!, toLat!, toLon!, mode),
    enabled:
      enabled &&
      fromLat != null &&
      fromLon != null &&
      toLat != null &&
      toLon != null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
