/**
 * TypeScript types matching the FastAPI backend contract exactly.
 */

/**
 * Represents a geographic address result from LINZ address search.
 */
export interface AddressResult {
  displayName: string
  lat: number
  lon: number
}

/**
 * Allow-listed OSM tags for a facility (phone, website, opening hours, etc.),
 * plus a few fields that may instead be filled in from Wikidata (description,
 * image, and website as a fallback) when the OSM element carries a
 * wikidataId. Only keys with a value are present.
 */
export interface FeatureDetails {
  phone?: string
  email?: string
  website?: string
  openingHours?: string
  operator?: string
  wheelchair?: string
  cuisine?: string
  emergency?: string
  healthcareSpeciality?: string
  wikidataId?: string
  description?: string
  image?: string
}

/**
 * Represents a single facility/feature found within the search radius.
 */
export interface Feature {
  id: string
  name: string
  category: string
  lat: number
  lon: number
  distanceKm: number
  details?: FeatureDetails | null
}

/**
 * Whether a facility type/category was evaluated for this request.
 * "not_checked" means it was excluded and rebalanced out of the score;
 * "scored" means it was evaluated (even if nothing was found, in which
 * case count === 0 but it still counts toward the score at full weight).
 */
export type FacilityStatus = 'not_checked' | 'scored'

export type CategoryId =
  | 'education'
  | 'transport'
  | 'healthcare'
  | 'shopping'
  | 'recreation'
  | 'food_and_drink'

/**
 * One criterion contributing to a facility type's explanation, e.g. "Schools
 * within 1.0 km". `satisfied` is null when the facility type wasn't checked
 * at all (unknown), distinct from `false` (checked, not met).
 */
export interface FacilityCriterion {
  label: string
  satisfied: boolean | null
  detail: string
}

/**
 * A facility type's (or category's) share of its parent's weight, and the
 * score it contributed with that weight — renormalized over the members that
 * were actually scored (not_checked members report weightPct 0, score null).
 */
export interface FacilityContribution {
  facilityType: string
  weightPct: number
  score: number | null
}

export interface CategoryContribution {
  category: CategoryId
  weightPct: number
  score: number | null
}

/**
 * Score breakdown for a single facility type (e.g. schools, bus_stops)
 * within a category.
 */
export interface FacilityScoreResult {
  facilityType: string
  status: FacilityStatus
  score: number | null
  nearestDistanceKm: number | null
  count: number
  explanation: string
  criteria: FacilityCriterion[]
}

/**
 * Score breakdown for one of the five composite categories, made up of
 * one or more facility types.
 */
export interface CategoryScoreResult {
  category: CategoryId
  status: FacilityStatus
  score: number | null
  facilities: FacilityScoreResult[]
  contribution: FacilityContribution[]
}

/**
 * Composite location score, derived from the five category scores.
 */
export interface ScoreResult {
  overall: number | null
  coverage: string // e.g., "4/5" — count of scored categories / total categories
  categories: CategoryScoreResult[]
  contribution: CategoryContribution[]
}

/**
 * The complete response from POST /location/analyze endpoint.
 */
export interface AnalyzeResponse {
  location: {
    lat: number
    lon: number
    displayName: string
  }
  features: Feature[]
  score: ScoreResult
  warnings: string[]
}

/**
 * Metadata for a facility category.
 */
export interface Category {
  id: string
  label: string
  implemented: boolean
  color: string // hex color code for map markers
  isDefault: boolean
  compositeCategory: string // which of the five composite categories (education, transport, ...) this rolls into
}

export type RouteTransportMode = 'driving' | 'walking' | 'cycling'

export interface RouteStep {
  instruction: string
  name: string
  distanceM: number
  durationS: number
}

export interface RouteOption {
  coordinates: [number, number][]
  durationS: number
  distanceM: number
  summary: string
  steps: RouteStep[]
}

export interface RouteResult {
  routes: RouteOption[]
  fallback?: boolean
}
