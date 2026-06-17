'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { SearchBar } from '@/components/SearchBar';
import { useStore } from '@/store';
import { useAnalyze } from '@/hooks/useAnalyze';

export function SearchContainer() {
  const t = useTranslations();
  const { setSelectedAddress, radiusKm, distanceMode } = useStore();
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
