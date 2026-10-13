import type { FeatureDetails } from "@/types/api";

/** Centre of New Zealand, used before any address has been selected. */
export const DEFAULT_MAP_CENTER: [number, number] = [-41.2865, 172.9988];
export const DEFAULT_MAP_ZOOM = 12;

/** Zoom used when flying to an address that has no matched parcel. */
export const ADDRESS_FLY_ZOOM = 14;

/** Padding (px) applied by each kind of fit/fly, so content isn't flush to the edge. */
export const PARCEL_FLY_PADDING: [number, number] = [40, 40];
export const FIT_BOUNDS_PADDING: [number, number] = [50, 50];
export const ROUTE_FIT_PADDING: [number, number] = [60, 60];

/** Used for a category with no configured colour, or an unknown category id. */
export const FALLBACK_MARKER_COLOR = "rgb(var(--color-neutral-500))";

/** Keeps the highlighted facility above every regular facility marker. */
export const SELECTED_FEATURE_Z_OFFSET = 1000;

/** Minimum number of points for a route to be drawn. */
export const MIN_ROUTE_POINTS = 2;

// Ordered, curated subset of FeatureDetails to show as text rows in the
// facility popup. `wikidataId` is omitted -- it's a linking key, not
// user-facing text. `image` is also omitted here -- it renders as a
// thumbnail below these rows instead of a label/value line.
export const FACILITY_DETAIL_FIELDS: Array<{ key: keyof FeatureDetails; i18nKey: string }> = [
  { key: "description", i18nKey: "map.markerPopup.details.description" },
  { key: "openingHours", i18nKey: "map.markerPopup.details.openingHours" },
  { key: "phone", i18nKey: "map.markerPopup.details.phone" },
  { key: "email", i18nKey: "map.markerPopup.details.email" },
  { key: "website", i18nKey: "map.markerPopup.details.website" },
  { key: "operator", i18nKey: "map.markerPopup.details.operator" },
  { key: "cuisine", i18nKey: "map.markerPopup.details.cuisine" },
  { key: "emergency", i18nKey: "map.markerPopup.details.emergency" },
  { key: "healthcareSpeciality", i18nKey: "map.markerPopup.details.healthcareSpeciality" },
  { key: "wheelchair", i18nKey: "map.markerPopup.details.wheelchair" },
];
