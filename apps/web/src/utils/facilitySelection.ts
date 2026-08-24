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

/** Composite category is never weighted by default -- see AGENTS.md's
 * "Default the Recreation category weightage to 0.0" acceptance criteria. */
const ZERO_WEIGHT_BY_DEFAULT = "recreation";

/** Which of the 5 composite categories are "active": at least one of their
 * facility types is present in the given (draft or committed) selection. */
export function getActiveCompositeCategories(
  allCategories: Category[],
  facilityIds: string[],
): string[] {
  const active = new Set(
    allCategories
      .filter((category) => facilityIds.includes(category.id))
      .map((category) => category.compositeCategory),
  );
  return [...active];
}

/**
 * Default weight-slider seed for a set of active composite categories:
 * Recreation is always forced to 0% (product default), and the remaining
 * active categories' DB ratios are renormalized among themselves so the
 * result always sums to 1.0. If every active category is zero-weighted by
 * default (i.e. Recreation is the *only* active category), there's nothing
 * left to renormalize -- split evenly across all active categories instead,
 * since the result must still sum to 1.
 */
export function computeDefaultWeightsForActiveCategories(
  activeCategories: string[],
  defaultRatios: Record<string, number>,
): Record<string, number> {
  const weighted = activeCategories.filter((category) => category !== ZERO_WEIGHT_BY_DEFAULT);
  const total = weighted.reduce((sum, category) => sum + (defaultRatios[category] ?? 0), 0);

  if (weighted.length === 0) {
    const equalShare = activeCategories.length > 0 ? 1 / activeCategories.length : 0;
    return Object.fromEntries(activeCategories.map((category) => [category, equalShare]));
  }

  const result: Record<string, number> = {};
  for (const category of activeCategories) {
    if (category === ZERO_WEIGHT_BY_DEFAULT) {
      result[category] = 0;
    } else {
      result[category] = total > 0 ? (defaultRatios[category] ?? 0) / total : 1 / weighted.length;
    }
  }
  return result;
}

/**
 * Resolves the `categoryWeights` param for POST /location/analyze. Returns
 * undefined (omit the param, let the backend apply its own default weights)
 * when the user hasn't customized weights yet -- once they have, always
 * send them, since adjusting weightage is a deliberate action meant to
 * change the computed score, not something to silently no-op away.
 */
export function resolveCategoryWeightsForRequest(
  categoryWeights: Record<string, number> | null | undefined,
): Record<string, number> | undefined {
  return categoryWeights ?? undefined;
}
