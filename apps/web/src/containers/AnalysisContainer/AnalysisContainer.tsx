'use client';

import ResultsPanel from './ResultsPanel';
import { NavigateContainer } from '@/containers/NavigateContainer';
import { useLocationStore } from '@/store';

export function AnalysisContainer() {
  const { selectedAddress, isNavigating } = useLocationStore();

  if (!selectedAddress) {
    return null;
  }

  if (isNavigating) {
    return <NavigateContainer />;
  }

  return <ResultsPanel />;
}
