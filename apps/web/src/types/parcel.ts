/**
 * LINZ Data Service Query API layer 50772 ("NZ Primary Parcels") field names.
 * All fields are present in the API response (with_field_names=true); nullable
 * fields are commonly null for road reserves, utility corridors, etc.
 */
export interface ParcelProperties {
  id: number
  appellation: string | null
  parcel_intent: string | null
  titles: string | null
  land_district: string | null
  topology_type: string | null
  affected_surveys: string | null
  statutory_actions: string | null
  survey_area: number | null
  calc_area: number
}

/**
 * A cadastral parcel matched from GET /api/parcels, passed straight
 * through from the LINZ Data Service Query API layer 50772.
 */
export interface ParcelFeature {
  type: "Feature"
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  properties: ParcelProperties
}
