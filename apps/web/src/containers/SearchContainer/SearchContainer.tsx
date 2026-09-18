"use client";

import { useCallback, useEffect, useRef } from "react";
import { SearchBar } from "@/components/SearchBar";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useAnalyzeCategories } from "@/hooks/useAnalyzeCategories";
import { useAnalyzeCategoryWeights } from "@/hooks/useAnalyzeCategoryWeights";
import { useLocationStore } from "@/store";
import { DEFAULT_RADIUS_KM } from "@/constants/radius";
import type { AddressResult } from "@/types/api";

export interface SearchContainerProps {
  query: string;
  setQuery: (query: string) => void;
  suggestions: AddressResult[];
  isLoading: boolean;
  error: string | null;
}

export function SearchContainer({
  query,
  setQuery,
  suggestions,
  isLoading,
  error,
}: SearchContainerProps) {
  const {
    selectedAddress,
    setSelectedAddress,
    setRadiusKm,
    distanceMode,
    setIsMapViewOnMobile,
    clearMapOverlays,
  } = useLocationStore();

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (selectedAddress) setQuery(selectedAddress.displayName);
  }, []);
  const { mutate: analyze } = useAnalyze();
  const analyzeCategories = useAnalyzeCategories();
  const analyzeCategoryWeights = useAnalyzeCategoryWeights();

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (selectedAddress && value !== selectedAddress.displayName) {
      setSelectedAddress(null);
      clearMapOverlays();
    }
  };

  const handleSelectAddress = useCallback(
    (address: AddressResult) => {
      setSelectedAddress(address);
      setQuery(address.displayName);
      setRadiusKm(DEFAULT_RADIUS_KM);
      setIsMapViewOnMobile(false);
      // A new address is a clean slate -- drop any markers/tooltip/route left
      // over from the previous address before the new analysis result arrives.
      clearMapOverlays();
      analyze({
        address: address.displayName,
        lat: address.lat,
        lon: address.lon,
        radiusKm: DEFAULT_RADIUS_KM,
        distanceMode,
        categories: analyzeCategories,
        categoryWeights: analyzeCategoryWeights,
      });
    },
    [
      setSelectedAddress,
      setQuery,
      setRadiusKm,
      setIsMapViewOnMobile,
      clearMapOverlays,
      analyze,
      distanceMode,
      analyzeCategories,
      analyzeCategoryWeights,
    ],
  );

  const handleClear = () => {
    setQuery("");
    setSelectedAddress(null);
    clearMapOverlays();
  };

  return (
    <SearchBar
      query={query}
      suggestions={suggestions}
      isLoading={isLoading}
      error={error}
      onQueryChange={handleQueryChange}
      onSelectAddress={handleSelectAddress}
      onClear={handleClear}
    />
  );
}

export default SearchContainer;
