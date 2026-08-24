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
 * Reduces `categories` by `amount` in total, proportional to each one's
 * current weight, clamping any category at 0 as it's exhausted and
 * re-spreading the leftover among what's left ("water-fill"). Used so a
 * slider can be dragged all the way to 100% without ever driving another
 * active category negative.
 */
function shrinkProportionally(
  weights: Record<string, number>,
  categories: string[],
  amount: number,
): Record<string, number> {
  const result = { ...weights };
  let remaining = categories.filter((category) => (result[category] ?? 0) > 0);
  let toReduce = amount;

  while (toReduce > 1e-9 && remaining.length > 0) {
    const sum = remaining.reduce((s, category) => s + (result[category] ?? 0), 0);
    if (sum <= 1e-9) break;

    const stillHasRoom: string[] = [];
    let reducedThisPass = 0;
    for (const category of remaining) {
      const current = result[category] ?? 0;
      const wanted = toReduce * (current / sum);
      if (wanted >= current) {
        reducedThisPass += current;
        result[category] = 0;
      } else {
        result[category] = current - wanted;
        reducedThisPass += wanted;
        stillHasRoom.push(category);
      }
    }
    toReduce -= reducedThisPass;
    remaining = stillHasRoom;
  }

  return result;
}

/**
 * Grows `categories` by `amount` in total, proportional to each one's
 * current weight (or split evenly if they're all currently 0).
 */
function growProportionally(
  weights: Record<string, number>,
  categories: string[],
  amount: number,
): Record<string, number> {
  if (categories.length === 0 || amount <= 0) return { ...weights };

  const result = { ...weights };
  const sum = categories.reduce((s, category) => s + (result[category] ?? 0), 0);
  if (sum > 1e-9) {
    for (const category of categories) {
      result[category] = (result[category] ?? 0) + amount * ((result[category] ?? 0) / sum);
    }
  } else {
    const equalShare = amount / categories.length;
    for (const category of categories) {
      result[category] = (result[category] ?? 0) + equalShare;
    }
  }
  return result;
}

/**
 * Applies a slider drag: sets `changedCategory` to `newValue` and absorbs
 * the delta across every other category currently in `weights`, keeping
 * the total pinned at 1.0 (auto-balancing, no manual rebalancing needed).
 * A no-op if `changedCategory` is the only active category (it must stay
 * at 100%).
 */
export function redistributeOnSliderChange(
  weights: Record<string, number>,
  changedCategory: string,
  newValue: number,
): Record<string, number> {
  const others = Object.keys(weights).filter((category) => category !== changedCategory);
  if (others.length === 0) {
    return { ...weights };
  }

  const clamped = Math.max(0, Math.min(1, newValue));
  const delta = clamped - (weights[changedCategory] ?? 0);
  const next = { ...weights, [changedCategory]: clamped };

  if (delta > 0) return shrinkProportionally(next, others, delta);
  if (delta < 0) return growProportionally(next, others, -delta);
  return next;
}

/**
 * A facility toggle just activated `newCategory` (its first selected
 * facility). It's given an initial share -- its DB-default ratio relative
 * to the new full active set -- carved out of the existing categories
 * proportionally. If there were no active categories before, it simply
 * takes the full 100%.
 */
export function redistributeOnActivate(
  weights: Record<string, number>,
  newCategory: string,
  defaultRatios: Record<string, number>,
): Record<string, number> {
  const existing = Object.keys(weights);
  if (existing.length === 0) {
    return { [newCategory]: 1 };
  }

  const targetWeights = computeDefaultWeightsForActiveCategories(
    [...existing, newCategory],
    defaultRatios,
  );
  const initWeight = targetWeights[newCategory] ?? 0;
  const shrunk = shrinkProportionally(weights, existing, initWeight);
  return { ...shrunk, [newCategory]: initWeight };
}

/**
 * A facility toggle just deactivated `removedCategory` (its last selected
 * facility was unchecked). Its weight is deleted and returned to the
 * remaining active categories, proportional to their current weight.
 */
export function redistributeOnDeactivate(
  weights: Record<string, number>,
  removedCategory: string,
): Record<string, number> {
  const freed = weights[removedCategory] ?? 0;
  const rest = { ...weights };
  delete rest[removedCategory];

  const remaining = Object.keys(rest);
  if (remaining.length === 0) return {};
  return growProportionally(rest, remaining, freed);
}

/**
 * Rounds fractional weights to display percentages that sum to exactly 100
 * (largest-remainder method), rather than each category's rounded percent
 * potentially drifting a point or two off from the true 100% total.
 */
export function roundWeightsForDisplay(weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  if (keys.length === 0) return {};

  const entries = keys.map((key) => {
    const exact = (weights[key] ?? 0) * 100;
    const floor = Math.floor(exact);
    return { key, floor, remainder: exact - floor };
  });

  const result: Record<string, number> = {};
  for (const entry of entries) result[entry.key] = entry.floor;

  const flooredSum = entries.reduce((sum, entry) => sum + entry.floor, 0);
  const leftover = Math.max(0, Math.min(entries.length, Math.round(100 - flooredSum)));
  const byRemainderDesc = [...entries].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < leftover; i++) {
    const entry = byRemainderDesc[i];
    if (entry) result[entry.key] = (result[entry.key] ?? 0) + 1;
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
