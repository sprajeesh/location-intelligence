"use client";

import { useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLocationStore } from "@/store";
import { DEFAULT_RADIUS_KM } from "@/constants/radius";
import type { AddressResult } from "@/types/api";

export function SearchContainer() {
  const { query, setQuery, suggestions, isLoading, error } = useAddressSearch();
  const { selectedAddress, setSelectedAddress, setRadiusKm, distanceMode } =
    useLocationStore();
  const { mutate: analyze } = useAnalyze();

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
      analyze({
        address: address.displayName,
        lat: address.lat,
        lon: address.lon,
        radiusKm: DEFAULT_RADIUS_KM,
        categories: ["schools", "bus_stops"],
        distanceMode,
      });
    },
    [setSelectedAddress, setQuery, setRadiusKm, analyze, distanceMode],
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
