"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/api";

/**
 * useCategories hook
 *
 * Fetches all facility types (grouped by composite category, with defaults
 * flagged) from GET /api/categories. Used by the Settings modal.
 */
export function useCategories() {
  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });

  return { categories, isLoading, isError };
}
