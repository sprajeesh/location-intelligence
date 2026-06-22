"use client";

import { useCallback, useRef } from "react";
import { useLocationStore } from "@/store/index";
import { fetchRoute } from "@/services/api";
import type { Feature } from "@/types/api";

// TODO: This hook currently manages request lifecycle manually with
// try/catch/finally; other hooks in the same directory (useAnalyze.ts,
// useAddressSearch.ts) already use useMutation and useQuery from
// @tanstack/react-query. Moving to useMutation would standardize
// loading/error/success state handling and align with the coding guideline
// requiring React Query v5 for server state management in
// apps/web/src/{hooks,services}/**/*.{ts,tsx}.
/**
 * Returns a navigate handler that fetches the OSRM route from the selected
 * address to a facility and stores it in the global route state.
 * A new call replaces the previous route.
 */
export function useNavigate() {
  const latestRequestRef = useRef(0);
  const {
    selectedAddress,
    setActiveRoute,
    setNavigatingFeatureId,
    setSelectedFeature,
  } = useLocationStore();

  return useCallback(
    async (feature: Feature) => {
      if (!selectedAddress) return;
      const requestId = ++latestRequestRef.current;
      const origin = { lat: selectedAddress.lat, lon: selectedAddress.lon };

      setNavigatingFeatureId(feature.id);
      setSelectedFeature(feature);
      try {
        const result = await fetchRoute(
          origin.lat,
          origin.lon,
          feature.lat,
          feature.lon,
        );
        if (latestRequestRef.current !== requestId) return;
        setActiveRoute(result.coordinates);
      } catch {
        if (latestRequestRef.current !== requestId) return;
        // Straight-line fallback
        setActiveRoute([
          [origin.lat, origin.lon],
          [feature.lat, feature.lon],
        ]);
      } finally {
        if (latestRequestRef.current === requestId) {
          setNavigatingFeatureId(null);
        }
      }
    },
    [
      selectedAddress,
      setActiveRoute,
      setNavigatingFeatureId,
      setSelectedFeature,
    ],
  );
}
