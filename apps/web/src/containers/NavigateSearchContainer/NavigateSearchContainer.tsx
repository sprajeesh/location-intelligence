"use client";

import { useEffect, useRef } from "react";
import { useLocationStore } from "@/store";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import NavigateSearchBar from "@/components/NavigateSearchBar";
import type { AddressResult } from "@/types/api";

export function NavigateSearchContainer() {
  const { navigateFrom, navigateTo, setNavigateFrom, setNavigateTo, exitNavigation } =
    useLocationStore();

  const fromSearch = useAddressSearch();
  const toSearch = useAddressSearch();

  // Pre-fill inputs once on mount from current store values
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (navigateFrom) fromSearch.setQuery(navigateFrom.displayName);
    if (navigateTo) toSearch.setQuery(navigateTo.displayName);
  }, []); // intentional empty deps — seed once on mount only

  const handleFromSelect = (address: AddressResult) => {
    setNavigateFrom(address);
    fromSearch.setQuery(address.displayName);
  };

  const handleToSelect = (address: AddressResult) => {
    setNavigateTo(address);
    toSearch.setQuery(address.displayName);
  };

  return (
    <NavigateSearchBar
      fromQuery={fromSearch.query}
      fromSuggestions={fromSearch.suggestions}
      fromIsLoading={fromSearch.isLoading}
      onFromQueryChange={fromSearch.setQuery}
      onFromSelect={handleFromSelect}
      toQuery={toSearch.query}
      toSuggestions={toSearch.suggestions}
      toIsLoading={toSearch.isLoading}
      onToQueryChange={toSearch.setQuery}
      onToSelect={handleToSelect}
      onBack={exitNavigation}
    />
  );
}

export default NavigateSearchContainer;
