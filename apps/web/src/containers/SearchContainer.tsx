'use client';

import { useCallback } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { useLocationStore } from '@/store';
import { useAnalyze } from '@/hooks/useAnalyze';

export function SearchContainer() {
  const { setSelectedAddress, radiusKm, distanceMode } = useLocationStore();
  const { mutate: analyze } = useAnalyze();

  const handleAddressSelect = useCallback(
    (address: { displayName: string; lat: number; lon: number }) => {
      setSelectedAddress(address);
      analyze({
        address: address.displayName,
        lat: address.lat,
        lon: address.lon,
        radiusKm,
        categories: ['schools', 'bus_stops'],
        distanceMode,
      });
    },
    [setSelectedAddress, analyze, radiusKm, distanceMode]
  );

  return <SearchBar onAddressSelect={handleAddressSelect} />;
}
