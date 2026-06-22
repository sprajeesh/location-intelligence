'use client';

import { useCallback } from 'react';
import ResultsPanel from './ResultsPanel';
import { NavigateContainer } from '@/containers/NavigateContainer';
import { useLocationStore } from '@/store';

export function AnalysisContainer() {
  const { radiusKm, setRadiusKm, selectedAddress, isNavigating } = useLocationStore();

  const handleIncreaseRadius = useCallback(() => {
    setRadiusKm(radiusKm + 5);
  }, [radiusKm, setRadiusKm]);

  if (!selectedAddress) {
    return null;
  }

  if (isNavigating) {
    return <NavigateContainer />;
  }

  return (
    <ResultsPanel
      onIncreaseRadius={handleIncreaseRadius}
    />
  );
}
