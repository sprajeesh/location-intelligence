"use client";

import { SearchBar } from "@/components/SearchBar";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useLocationStore } from "@/store";
import type { AddressResult } from "@/types/api";

export function SearchContainer() {
  const { query, setQuery, suggestions, isLoading, error } = useAddressSearch();
  const { selectedAddress, setSelectedAddress } = useLocationStore();

  const displayValue = query;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (selectedAddress && value !== selectedAddress.displayName) {
      setSelectedAddress(null);
    }
  };

  const handleSelectAddress = (address: AddressResult) => {
    setSelectedAddress(address);
    setQuery(address.displayName);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedAddress(null);
  };

  return (
    <SearchBar
      query={displayValue}
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
