/**
 * TypeScript types matching the FastAPI backend contract exactly.
 */

import type { HazardResult } from "./hazard"

/**
 * Represents a geographic address result from LINZ address search.
 */
export interface AddressResult {
  displayName: string
  lat: number
  lon: number
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
}

/**
 * Composite location score, derived from the five category scores.
 */
export interface ScoreResult {
  overall: number | null
  coverage: string // e.g., "4/5" — count of scored categories / total categories
  categories: CategoryScoreResult[]
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
  // Deliberately a top-level sibling of `score`, never nested inside it --
  // hazard exposure is never blended into the facility overall score. Null
  // until the backend has hazard grid coverage for this point.
  hazard: HazardResult | null
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
