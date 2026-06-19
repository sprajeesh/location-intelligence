'use client';

import { useCallback } from 'react';
import ResultsPanel from '@/components/ResultsPanel';
import { useLocationStore } from '@/store';

export function AnalysisContainer() {
  const { radiusKm, setRadiusKm, selectedAddress } = useLocationStore();

  const handleIncreaseRadius = useCallback(() => {
    setRadiusKm(radiusKm + 5);
  }, [radiusKm, setRadiusKm]);

  // Panel is invisible until the user selects an address
  if (!selectedAddress) {
    return null;
  }

  return (
    <ResultsPanel
      onIncreaseRadius={handleIncreaseRadius}
    />
  );
}
