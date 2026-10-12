"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRoute } from "@/services/api";
import type { RouteTransportMode } from "@/types/api";
import { createTraceId } from "@/lib/tracing";

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
  // One correlation ID per route. Retries of the same route reuse it.
  const correlationId = useMemo(() => createTraceId(), [fromLat, fromLon, toLat, toLon, mode]);

  return useQuery({
    queryKey: ["route", fromLat, fromLon, toLat, toLon, mode],
    queryFn: () => fetchRoute(fromLat!, fromLon!, toLat!, toLon!, mode, correlationId),
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
