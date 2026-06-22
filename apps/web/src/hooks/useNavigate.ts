"use client";

import { useCallback } from "react";
import { useLocationStore } from "@/store/index";
import type { Feature } from "@/types/api";

/**
 * Returns a navigate handler that enters navigation mode for the given facility.
 * Seeds navigateFrom from the current selectedAddress and navigateTo from the
 * facility's coordinates. Route fetching is handled by NavigateContainer.
 */
export function useNavigate() {
  const {
    selectedAddress,
    setIsNavigating,
    setSelectedFeature,
    setRouteMode,
    setActiveRoute,
    setNavigatingFeatureId,
    setNavigateFrom,
    setNavigateTo,
  } = useLocationStore();

  return useCallback(
    (feature: Feature) => {
      setSelectedFeature(feature);
      setIsNavigating(true);
      setRouteMode("driving");
      setActiveRoute(null);
      setNavigatingFeatureId(null);
      setNavigateFrom(selectedAddress);
      setNavigateTo({
        displayName: feature.name,
        lat: feature.lat,
        lon: feature.lon,
      });
    },
    [
      selectedAddress,
      setIsNavigating,
      setSelectedFeature,
      setRouteMode,
      setActiveRoute,
      setNavigatingFeatureId,
      setNavigateFrom,
      setNavigateTo,
    ],
  );
}
