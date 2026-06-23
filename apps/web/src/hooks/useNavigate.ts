"use client";

import { useCallback } from "react";
import { useLocationStore } from "@/store/index";
import type { Feature } from "@/types/api";

export function useNavigate() {
  const {
    selectedAddress,
    setIsNavigating,
    setSelectedFeature,
    setRouteMode,
    setActiveRoute,
    setNavigateFrom,
    setNavigateTo,
  } = useLocationStore();

  return useCallback(
    (feature: Feature) => {
      setSelectedFeature(feature);
      setIsNavigating(true);
      setRouteMode("driving");
      setActiveRoute(null);
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
      setNavigateFrom,
      setNavigateTo,
    ],
  );
}
