import type {
  CategoryId,
  CategoryScoreResult,
  FacilityCriterion,
  FacilityScoreResult,
  ScoreResult,
} from "@/types/api";

/**
 * Canonical display order for the six categories, matching CATEGORY_WEIGHTS'
 * descending-weight order in apps/api/app/config/scoring_config.py. The API's
 * array order isn't a guaranteed contract, so this is sorted explicitly.
 */
export const CATEGORY_DISPLAY_ORDER: CategoryId[] = [
  "education",
  "transport",
  "healthcare",
  "shopping",
  "recreation",
  "food_and_drink",
];

/**
 * Canonical facility-type order within each category, matching
 * CATEGORY_FACILITY_WEIGHTS in apps/api/app/config/scoring_config.py.
 */
const FACILITY_DISPLAY_ORDER: Record<CategoryId, string[]> = {
  education: ["schools", "kindergartens", "universities"],
  recreation: ["parks", "playgrounds", "libraries"],
  transport: ["bus_stops", "railway_stations"],
  healthcare: ["gps", "hospitals", "pharmacies"],
  shopping: ["supermarkets"],
  food_and_drink: ["restaurants", "pubs_bars"],
};

export function sortCategoriesForDisplay(
  categories: CategoryScoreResult[],
): CategoryScoreResult[] {
  return [...categories].sort(
    (a, b) =>
      CATEGORY_DISPLAY_ORDER.indexOf(a.category) -
      CATEGORY_DISPLAY_ORDER.indexOf(b.category),
  );
}

export function sortFacilitiesForDisplay(
  category: CategoryId,
  facilities: FacilityScoreResult[],
): FacilityScoreResult[] {
  const order = FACILITY_DISPLAY_ORDER[category] ?? [];
  return [...facilities].sort(
    (a, b) => order.indexOf(a.facilityType) - order.indexOf(b.facilityType),
  );
}

/** Parses "4/5" -> { scored: 4, total: 5 }. Defensive against malformed input. */
export function parseCoverage(coverage: string): { scored: number; total: number } {
  const [scoredStr, totalStr] = coverage.split("/");
  const scored = Number.parseInt(scoredStr ?? "", 10);
  const total = Number.parseInt(totalStr ?? "", 10);
  return {
    scored: Number.isNaN(scored) ? 0 : scored,
    total: Number.isNaN(total) ? 0 : total,
  };
}

export type ScoreColorTier = "good" | "moderate" | "poor" | "unscored";

/** Single canonical score-to-tier mapping: >=70 good, >=50 moderate, else poor. */
export function getScoreColorTier(score: number | null): ScoreColorTier {
  if (score === null) return "unscored";
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  return "poor";
}

/** Formats a score for display: rounded to the nearest integer, or "—" when null. */
export function formatScoreValue(score: number | null): string {
  return score !== null ? String(Math.round(score)) : "—";
}

export function getScoreColorClass(score: number | null): string {
  switch (getScoreColorTier(score)) {
    case "good":
      return "text-success-600";
    case "moderate":
      return "text-warning-600";
    case "poor":
      return "text-error-600";
    case "unscored":
      return "text-slate-400";
  }
}

/** Same tier mapping as getScoreColorClass, as a progress-bar fill instead of text color. */
export function getScoreBarColorClass(score: number | null): string {
  switch (getScoreColorTier(score)) {
    case "good":
      return "bg-success-500";
    case "moderate":
      return "bg-warning-500";
    case "poor":
      return "bg-error-500";
    case "unscored":
      return "bg-slate-300";
  }
}

/**
 * Three-state display status for a facility. The raw API `status` field only
 * distinguishes checked/not_checked — "found nothing" and "found something
 * low-scoring" both come back as status "scored", so this additionally
 * checks `count` to tell them apart for display purposes.
 */
export type FacilityDisplayStatus = "scored" | "not_checked" | "no_data_found";

export function resolveFacilityDisplayStatus(
  facility: FacilityScoreResult,
): FacilityDisplayStatus {
  if (facility.status === "not_checked") return "not_checked";
  if (facility.count === 0) return "no_data_found";
  return "scored";
}

/**
 * One row of the score explanation panel -- a facility type (within a
 * category's explanation) or a category (within the overall explanation).
 * `kind` tells the panel which template to render; it's set explicitly by
 * the two builders below rather than inferred from `criteria` being empty,
 * so rendering never depends on an unenforced backend invariant (that
 * facility-type criteria lists are never empty). `criteria` itself is only
 * ever populated for facility-type rows -- category rows have no structured
 * criteria of their own, only a score/status/weight.
 */
export interface ExplainItem {
  /** facilityType (category modal) or CategoryId (overall modal) -- translate via
   * score.facilityTypes.<key> / score.categories.<key> in the component. */
  key: string;
  kind: "facility" | "category";
  status: "not_checked" | "scored";
  score: number | null;
  weightPct: number;
  criteria: FacilityCriterion[];
}

/** Builds the explanation rows for one category's modal, one per member facility type. */
export function buildCategoryExplainItems(category: CategoryScoreResult): ExplainItem[] {
  const contributionByType = new Map(category.contribution.map((c) => [c.facilityType, c]));
  return sortFacilitiesForDisplay(category.category, category.facilities).map((facility) => ({
    key: facility.facilityType,
    kind: "facility",
    status: facility.status,
    score: facility.score,
    weightPct: contributionByType.get(facility.facilityType)?.weightPct ?? 0,
    criteria: facility.criteria,
  }));
}

/** Builds the explanation rows for the overall-score modal, one per category. */
export function buildOverallExplainItems(score: ScoreResult): ExplainItem[] {
  const contributionByCategory = new Map(score.contribution.map((c) => [c.category, c]));
  return sortCategoriesForDisplay(score.categories).map((category) => ({
    key: category.category,
    kind: "category",
    status: category.status,
    score: category.score,
    weightPct: contributionByCategory.get(category.category)?.weightPct ?? 0,
    criteria: [],
  }));
}
