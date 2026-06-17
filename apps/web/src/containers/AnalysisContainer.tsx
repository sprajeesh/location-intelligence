'use client';

import { useCallback } from 'react';
import ResultsPanel from '@/components/ResultsPanel';
import { useLocationStore } from '@/store';

export function AnalysisContainer() {
  const {
    analysisResult,
    visibleCategories,
    toggleCategoryVisibility,
    selectedAddress,
    radiusKm,
  } = useLocationStore();

  const handleFacilityCenterMap = useCallback(
    (lat: number, lon: number) => {
      window.dispatchEvent(
        new CustomEvent('map:center', { detail: { lat, lon, zoom: 16 } })
      );
    },
    []
  );

  const { setRadiusKm, distanceMode } = useLocationStore();
  const { mutate: analyze } = useCallback(() => {
    // This is a placeholder - will be wired up properly
  }, []);

  const handleIncreaseRadius = useCallback(() => {
    setRadiusKm(radiusKm + 5);
  }, [radiusKm, setRadiusKm]);

  return (
    <ResultsPanel
      data={analysisResult}
      visibleCategories={visibleCategories}
      onToggleCategoryVisibility={toggleCategoryVisibility}
      onFacilityCenterMap={handleFacilityCenterMap}
      onIncreaseRadius={handleIncreaseRadius}
    />
  );
}
