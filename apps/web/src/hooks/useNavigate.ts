'use client';

import { useCallback } from 'react';
import { useLocationStore } from '@/store/index';
import { fetchRoute } from '@/services/api';
import type { Feature } from '@/types/api';

/**
 * Returns a navigate handler that fetches the OSRM route from the selected
 * address to a facility and stores it in the global route state.
 * A new call replaces the previous route.
 */
export function useNavigate() {
  const {
    selectedAddress,
    setActiveRoute,
    setNavigatingFeatureId,
    setSelectedFeature,
  } = useLocationStore();

  return useCallback(
    async (feature: Feature) => {
      if (!selectedAddress) return;

      setNavigatingFeatureId(feature.id);
      setSelectedFeature(feature);
      try {
        const result = await fetchRoute(
          selectedAddress.lat,
          selectedAddress.lon,
          feature.lat,
          feature.lon,
        );
        setActiveRoute(result.coordinates);
      } catch {
        // Straight-line fallback
        setActiveRoute([
          [selectedAddress.lat, selectedAddress.lon],
          [feature.lat, feature.lon],
        ]);
      } finally {
        setNavigatingFeatureId(null);
      }
    },
    [selectedAddress, setActiveRoute, setNavigatingFeatureId],
  );
}
