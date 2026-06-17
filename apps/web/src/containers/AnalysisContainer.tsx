'use client';

import { useCallback } from 'react';
import ResultsPanel from '@/components/ResultsPanel';
import { useLocationStore } from '@/store';

export function AnalysisContainer() {
  const { radiusKm, setRadiusKm } = useLocationStore();

  const handleIncreaseRadius = useCallback(() => {
    setRadiusKm(radiusKm + 5);
  }, [radiusKm, setRadiusKm]);

  return (
    <ResultsPanel
      onIncreaseRadius={handleIncreaseRadius}
    />
  );
}
