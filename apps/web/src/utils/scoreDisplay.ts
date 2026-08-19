import type { CategoryId, CategoryScoreResult, FacilityScoreResult } from "@/types/api";

/**
 * Canonical display order for the five categories, matching CATEGORY_WEIGHTS'
 * descending-weight order in apps/api/app/config/scoring_config.py. The API's
 * array order isn't a guaranteed contract, so this is sorted explicitly.
 */
export const CATEGORY_DISPLAY_ORDER: CategoryId[] = [
  "education",
  "transport",
  "healthcare",
  "shopping",
  "recreation",
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
