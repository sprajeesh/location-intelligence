'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ResultsPanel } from '@/components/ResultsPanel';
import { useStore } from '@/store';

export function AnalysisContainer() {
  const t = useTranslations();
  const {
    analysisResult,
    visibleCategories,
    toggleCategoryVisibility,
    selectedAddress,
    radiusKm,
  } = useStore();

  const handleFacilityCenterMap = useCallback(
    (lat: number, lon: number) => {
      window.dispatchEvent(
        new CustomEvent('map:center', { detail: { lat, lon, zoom: 16 } })
      );
    },
    []
  );

  const handleIncreaseRadius = useCallback(() => {
    const { setRadiusKm } = useStore.getState();
    setRadiusKm(radiusKm + 5);
    const { selectedAddress: addr, distanceMode } = useStore.getState();
    if (addr) {
      const { useAnalyze } = require('@/hooks/useAnalyze');
      const { mutate: analyze } = useAnalyze();
      analyze({
        address: addr.displayName,
        lat: addr.lat,
        lon: addr.lon,
        radiusKm: radiusKm + 5,
        categories: ['schools', 'bus_stops'],
        distanceMode,
      });
    }
  }, [radiusKm]);

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
