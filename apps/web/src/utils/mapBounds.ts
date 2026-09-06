import L from "leaflet";
import type { Feature, AddressResult } from "@/types/api";
import type { ParcelFeature } from "@/types/parcel";

export interface MapBoundsInput {
  selectedAddress?: AddressResult | null;
  parcelFeature?: ParcelFeature | null;
  features?: Feature[] | null;
  activeRoute?: [number, number][] | null;
}

/**
 * Computes Leaflet bounds encompassing every map element passed in: the
 * parcel outline, marker features, the active route, and the selected
 * address as a fallback point. Returns null when nothing valid to fit to.
 */
export function computeMapBounds({
  selectedAddress,
  parcelFeature,
  features,
  activeRoute,
}: MapBoundsInput): L.LatLngBounds | null {
  const bounds = L.latLngBounds([]);

  if (parcelFeature) {
    const parcelBounds = L.geoJSON(
      parcelFeature as unknown as GeoJSON.Feature,
    ).getBounds();
    if (parcelBounds.isValid()) bounds.extend(parcelBounds);
  }

  for (const feature of features ?? []) {
    bounds.extend([feature.lat, feature.lon]);
  }

  if (activeRoute && activeRoute.length >= 2) {
    bounds.extend(L.latLngBounds(activeRoute));
  }

  if (selectedAddress) {
    bounds.extend([selectedAddress.lat, selectedAddress.lon]);
  }

  return bounds.isValid() ? bounds : null;
}
