'use client';

import { useCallback } from 'react';
import { RadiusSelector } from '@/components/RadiusSelector';
import { useLocationStore } from '@/store';
import { useAnalyze } from '@/hooks/useAnalyze';

export function RadiusSelectorContainer() {
  const {
    radiusKm,
    setRadiusKm,
    selectedAddress,
    isAnalyzing,
    distanceMode,
    setAnalysisResult,
    clearVisibleCategories,
  } = useLocationStore();

  const { mutate: analyze } = useAnalyze();

  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      setRadiusKm(newRadius);
      setAnalysisResult(null);
      clearVisibleCategories();

      if (selectedAddress) {
        analyze({
          address: selectedAddress.displayName,
          lat: selectedAddress.lat,
          lon: selectedAddress.lon,
          radiusKm: newRadius,
          categories: ['schools', 'bus_stops'],
          distanceMode,
        });
      }
    },
    [selectedAddress, distanceMode, setRadiusKm, setAnalysisResult, clearVisibleCategories, analyze]
  );

  return (
    <RadiusSelector
      value={radiusKm}
      onChange={handleRadiusChange}
      disabled={isAnalyzing}
    />
  );
}
