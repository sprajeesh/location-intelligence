import type { Category } from "@/types/api";

/** Max number of facility types a user may select at once in Settings. */
export const MAX_SELECTED_FACILITIES = 5;

export function getDefaultFacilityIds(categories: Category[]): string[] {
  return categories.filter((category) => category.isDefault).map((category) => category.id);
}

export function isSameFacilitySet(a: string[], b: string[]): boolean {
  const sortedA = [...new Set(a)].sort();
  const sortedB = [...new Set(b)].sort();
  return sortedA.length === sortedB.length && sortedA.every((id, i) => id === sortedB[i]);
}

/**
 * Resolves the `categories` param for POST /location/analyze from the
 * user's saved facility selection. Returns undefined (omit the param, let
 * the backend apply its own default facility set) when the user hasn't
 * customized anything yet, or when their selection matches the defaults
 * anyway — this keeps the API decoupled from session/selection state
 * whenever nothing has actually changed.
 */
export function resolveCategoriesForRequest(
  allCategories: Category[],
  selectedFacilities: string[] | null | undefined,
): string[] | undefined {
  if (!selectedFacilities) return undefined;
  if (isSameFacilitySet(selectedFacilities, getDefaultFacilityIds(allCategories))) return undefined;
  return selectedFacilities;
}
