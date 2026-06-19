'use client';

import { SearchBar } from '@/components/SearchBar';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useLocationStore } from '@/store';
import type { AddressResult } from '@/types/api';

export function SearchContainer() {
  const { query, setQuery, suggestions, isLoading, error } =
    useAddressSearch();
  const { selectedAddress, setSelectedAddress } = useLocationStore();

  const displayValue = selectedAddress?.displayName || query;

  const handleSelectAddress = (address: AddressResult) => {
    setSelectedAddress(address);
    setQuery(address.displayName);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedAddress(null);
  };

  return (
    <SearchBar
      query={displayValue}
      suggestions={suggestions}
      isLoading={isLoading}
      error={error}
      onQueryChange={setQuery}
      onSelectAddress={handleSelectAddress}
      onClear={handleClear}
    />
  );
}

export default SearchContainer;
