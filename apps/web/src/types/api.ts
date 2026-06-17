/**
 * TypeScript types matching the FastAPI backend contract exactly.
 */

/**
 * Represents a geographic address result from Photon autocomplete.
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
 * Location scores for different categories and an overall score.
 * Null values indicate the category was not queried or had no data.
 */
export interface ScoreResult {
  education: number | null
  healthcare: number | null
  transport: number | null
  shopping: number | null
  overall: number | null
  coverage: string // e.g., "2/4" — count of categories with data / total queried
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
}
