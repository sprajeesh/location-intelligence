/**
 * Hazard scoring types, matching the FastAPI backend contract exactly.
 * Kept separate from types/api.ts since it's a distinct sub-domain.
 */

/**
 * Phase-0 scaffold: only "demo_hazard" exists today. Treated as an
 * extensible string everywhere it's used -- never assume this is the only
 * member once real hazard types (seismic, faults, volcanic, ...) land.
 */
export type HazardType = string

export interface HazardSubScore {
  hazardType: HazardType
  score: number // 0-100
  source: string
  currencyDate: string // ISO date string
  isProxy: boolean
  isSevere: boolean
}

/**
 * Point-in-time hazard result for one address, attached to AnalyzeResponse.
 * Deliberately a top-level sibling of `score` (not nested inside it) --
 * hazard exposure is never blended into the facility overall score, since
 * averaging can hide a single catastrophic risk (see HAZARD.md).
 */
export interface HazardResult {
  composite: number // 0-100 weighted composite
  worstHazard: number // 0-100 max sub-score across hazards -- always shown
  worstHazardType: HazardType
  anySevere: boolean
  hazards: HazardSubScore[]
  disclaimer: string
}

/** Per-cell hazard breakdown inside the GET /hazard/cells GeoJSON response. */
export interface HazardCellProperties {
  cellId: string // H3 index
  resolution: number
  composite: number
  worstHazard: number
  worstHazardType: HazardType
  anySevere: boolean
  hazards: HazardSubScore[]
}

export interface HazardCellFeature {
  type: "Feature"
  geometry: GeoJSON.Polygon
  properties: HazardCellProperties
}

export interface HazardCellCollection {
  type: "FeatureCollection"
  features: HazardCellFeature[]
}
