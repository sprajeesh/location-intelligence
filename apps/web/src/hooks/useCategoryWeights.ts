"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategoryWeights } from "@/services/api";

/**
 * useCategoryWeights hook
 *
 * Fetches the DB-configured default composite-category weights from
 * GET /api/category-weights. Used to seed the Settings weight sliders.
 */
export function useCategoryWeights() {
  const {
    data: categoryWeights = {},
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["category-weights"],
    queryFn: getCategoryWeights,
    staleTime: 1000 * 60 * 10,
  });

  return { categoryWeights, isLoading, isError };
}
