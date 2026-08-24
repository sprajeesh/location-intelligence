"use client";

import { useLocationStore } from "@/store";
import { resolveCategoryWeightsForRequest } from "@/utils/facilitySelection";

/**
 * useAnalyzeCategoryWeights hook
 *
 * Resolves the `categoryWeights` param to pass into POST /location/analyze
 * from the user's saved weight configuration. Returns undefined whenever
 * nothing has been customized, so the backend keeps applying its own
 * default category weights.
 */
export function useAnalyzeCategoryWeights(): Record<string, number> | undefined {
  const { categoryWeights } = useLocationStore();
  return resolveCategoryWeightsForRequest(categoryWeights);
}
