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
  const { selectedAddress, setSelectedAddress, setRadiusKm, distanceMode, setIsMapViewOnMobile } =
    useLocationStore();

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
    }
  };

  const handleSelectAddress = useCallback(
    (address: AddressResult) => {
      setSelectedAddress(address);
      setQuery(address.displayName);
      setRadiusKm(DEFAULT_RADIUS_KM);
      setIsMapViewOnMobile(false);
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
      analyze,
      distanceMode,
      analyzeCategories,
      analyzeCategoryWeights,
    ],
  );

  const handleClear = () => {
    setQuery("");
    setSelectedAddress(null);
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
