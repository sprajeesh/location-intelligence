"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHazardCells } from "@/services/api";
import { useLocationStore } from "@/store/index";

// Phase-0 scaffold: the demo hazard dataset lives in one fixed Auckland
// bbox, not a nationwide layer -- fetching by fixed bbox (rather than by
// viewport, which would need debounced moveend wiring) is the right amount
// of complexity for a small, static demo dataset. Revisit when real
// national coverage lands.
export const HAZARD_SCAFFOLD_BBOX: [number, number, number, number] = [
  174.6, -37.05, 174.95, -36.6,
];

/**
 * useHazardCells hook
 *
 * Fetches the GeoJSON hazard cell layer from GET /api/hazard/cells, gated
 * on the hazard layer being toggled visible -- not fetched eagerly on page
 * load, and not tied to the per-address /location/analyze call, since the
 * map layer's lifetime (a large area) differs from a single address
 * result's lifetime.
 */
export function useHazardCells(enabled: boolean) {
  const setHazardCells = useLocationStore((s) => s.setHazardCells);

  const query = useQuery({
    queryKey: ["hazard-cells", HAZARD_SCAFFOLD_BBOX],
    queryFn: () => fetchHazardCells(HAZARD_SCAFFOLD_BBOX),
    enabled,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    setHazardCells(query.data ?? null);
  }, [query.data, setHazardCells]);

  return query;
}
