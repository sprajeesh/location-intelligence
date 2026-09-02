/**
 * A cadastral parcel matched from GET /api/parcels/at-point, passed straight
 * through from the LINZ Data Service Query API. Properties are kept loose --
 * only the geometry is used to draw the map highlight, and LINZ's field names
 * for layer 50772 aren't part of this app's own wire contract.
 */
export interface ParcelFeature {
  type: "Feature"
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  properties: Record<string, unknown>
}
