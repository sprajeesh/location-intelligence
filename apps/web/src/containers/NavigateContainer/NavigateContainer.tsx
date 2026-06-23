"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/store";
import { useRoute } from "@/hooks/useRoute";
import RoutePanel from "@/components/RoutePanel";
import type { RouteTransportMode } from "@/types/api";

export function NavigateContainer() {
  const {
    navigateFrom,
    navigateTo,
    routeMode,
    isNavigating,
    setRouteMode,
    setActiveRoute,
  } = useLocationStore();

  const { data, isLoading, error } = useRoute(
    navigateFrom?.lat,
    navigateFrom?.lon,
    navigateTo?.lat,
    navigateTo?.lon,
    routeMode,
    isNavigating && !!navigateFrom && !!navigateTo,
  );

  useEffect(() => {
    if (!data?.routes?.length) return;
    const fastest = data.routes.reduce((a, b) =>
      a.durationS <= b.durationS ? a : b,
    );
    setActiveRoute(fastest.coordinates);
  }, [data, setActiveRoute]);

  const handleModeChange = (mode: RouteTransportMode) => {
    setRouteMode(mode);
    setActiveRoute(null);
  };

  return (
    <RoutePanel
      routes={data?.routes ?? null}
      activeMode={routeMode}
      isLoading={isLoading}
      error={error ? error.message : null}
      destinationName={navigateTo?.displayName ?? ""}
      onModeChange={handleModeChange}
    />
  );
}

export default NavigateContainer;
