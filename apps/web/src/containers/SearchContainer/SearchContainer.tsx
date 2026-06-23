"use client";

import { useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useLocationStore } from "@/store";
import type { AddressResult } from "@/types/api";

export function SearchContainer() {
  const { query, setQuery, suggestions, isLoading, error } = useAddressSearch();
  const { selectedAddress, setSelectedAddress, radiusKm, distanceMode } =
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
      analyze({
        address: address.displayName,
        lat: address.lat,
        lon: address.lon,
        radiusKm,
        categories: ["schools", "bus_stops"],
        distanceMode,
      });
    },
    [setSelectedAddress, setQuery, analyze, radiusKm, distanceMode],
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
