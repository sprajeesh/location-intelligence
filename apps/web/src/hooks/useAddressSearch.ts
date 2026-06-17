'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AddressResult } from '@/types/api';

/**
 * useAddressSearch hook
 *
 * Provides 300ms debounced autocomplete search for addresses.
 * Returns:
 * - `query`: current search query
 * - `setQuery`: update search query (debounced internally)
 * - `suggestions`: array of top 5 address results
 * - `isLoading`: whether search is in progress
 * - `error`: error message if search failed
 */

export function useAddressSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce the query input by 300ms
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Query the BFF proxy endpoint
  const {
    data: suggestions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['address-search', debouncedQuery],
    queryFn: async (): Promise<AddressResult[]> => {
      if (!debouncedQuery.trim()) {
        return [];
      }

      const params = new URLSearchParams({
        q: debouncedQuery,
        country: 'nz',
      });

      const response = await fetch(`/api/search/address?${params}`);
      if (!response.ok) {
        throw new Error(`Address search failed: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    suggestions,
    isLoading,
    error: error?.message || null,
  };
}
