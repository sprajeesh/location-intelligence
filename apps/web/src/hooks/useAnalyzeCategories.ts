"use client";

import { useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";
import { useLocationStore } from "@/store";
import { resolveCategoriesForRequest } from "@/utils/facilitySelection";

/**
 * useAnalyzeCategories hook
 *
 * Resolves the `categories` param to pass into POST /location/analyze from
 * the user's saved facility selection. Returns undefined whenever nothing
 * has been customized (or the customization matches the backend defaults
 * anyway), so the backend keeps applying its own default facility set.
 */
export function useAnalyzeCategories(): string[] | undefined {
  const { categories } = useCategories();
  const { selectedFacilities } = useLocationStore();

  return useMemo(
    () => resolveCategoriesForRequest(categories, selectedFacilities),
    [categories, selectedFacilities],
  );
}
