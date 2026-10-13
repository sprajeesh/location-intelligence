import L from "leaflet";

/**
 * Leaflet `divIcon` builders for the map's markers.
 *
 * All colors go through `rgb(var(--color-x))` (see src/i18n/globals.css)
 * rather than literal CSS colors, including `white`, so markers re-theme with
 * the rest of the app in dark mode. Shadow color (16,24,40) intentionally
 * matches tailwind.config.ts's `boxShadow` tokens rather than plain black.
 */

const MAIN_MARKER_SIZE = 32;
const HOUSE_MARKER_SIZE = 32;
const FACILITY_MARKER_SIZE = 28;
const SELECTED_MARKER_SIZE = 38;
const SELECTED_INNER_SIZE = 24;

interface CircleOptions {
  size: number;
  background: string;
  borderWidth?: number;
  shadowBlur: number;
  shadowAlpha: number;
  content?: string;
  extraStyle?: string;
}

/** Shared white-ringed circle used by every marker except the pulse halo. */
function circleHtml({
  size,
  background,
  borderWidth = 3,
  shadowBlur,
  shadowAlpha,
  content = "",
  extraStyle = "",
}: CircleOptions): string {
  return `<div style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; background: ${background}; border: ${borderWidth}px solid rgb(var(--color-white)); border-radius: 50%; box-shadow: 0 2px ${shadowBlur}px rgba(16, 24, 40, ${shadowAlpha});${extraStyle}">${content}</div>`;
}

interface DivIconOptions {
  html: string;
  className: string;
  size: number;
  withPopupAnchor?: boolean;
}

function buildDivIcon({
  html,
  className,
  size,
  withPopupAnchor = true,
}: DivIconOptions): L.DivIcon {
  const half = size / 2;
  return L.divIcon({
    html,
    className,
    iconSize: [size, size],
    iconAnchor: [half, half],
    ...(withPopupAnchor && { popupAnchor: [0, -half] as [number, number] }),
  });
}

/** Red pin for the address point, shown until a parcel matches. */
export function createMainLocationIcon(): L.DivIcon {
  const dot = `<div style="width: 8px; height: 8px; background: rgb(var(--color-white)); border-radius: 50%;"></div>`;
  return buildDivIcon({
    html: circleHtml({
      size: MAIN_MARKER_SIZE,
      background: "rgb(var(--color-error-500))",
      shadowBlur: 8,
      shadowAlpha: 0.3,
      content: dot,
    }),
    className: "leaflet-main-marker",
    size: MAIN_MARKER_SIZE,
  });
}

/**
 * Yellow house icon marking the address's matched parcel.
 * Same shape as the main location pin, but in the warning token; the glyph
 * uses the ink token rather than white, since white on yellow is low contrast.
 */
export function createHouseIcon(iconMarkup: string): L.DivIcon {
  return buildDivIcon({
    html: circleHtml({
      size: HOUSE_MARKER_SIZE,
      background: "rgb(var(--color-warning-500))",
      shadowBlur: 8,
      shadowAlpha: 0.3,
      content: iconMarkup,
    }),
    className: "leaflet-house-marker",
    size: HOUSE_MARKER_SIZE,
    withPopupAnchor: false,
  });
}

/** Colored circle with the category glyph for a facility marker. */
export function createFacilityIcon(color: string, iconMarkup: string): L.DivIcon {
  return buildDivIcon({
    html: circleHtml({
      size: FACILITY_MARKER_SIZE,
      background: color,
      borderWidth: 2,
      shadowBlur: 6,
      shadowAlpha: 0.3,
      content: iconMarkup,
    }),
    className: "leaflet-category-marker",
    size: FACILITY_MARKER_SIZE,
  });
}

/**
 * Larger facility marker with a pulsing halo, rendered on top of the regular
 * markers for the currently selected facility.
 */
export function createSelectedFacilityIcon(
  color: string,
  iconMarkup: string,
): L.DivIcon {
  const halo = `<div style="position: absolute; width: ${SELECTED_MARKER_SIZE}px; height: ${SELECTED_MARKER_SIZE}px; border-radius: 50%; background: ${color}; opacity: 0.2; border: 2px solid ${color}; animation: leaflet-selected-pulse 1.5s ease-in-out infinite;"></div>`;
  const core = circleHtml({
    size: SELECTED_INNER_SIZE,
    background: color,
    shadowBlur: 8,
    shadowAlpha: 0.4,
    content: iconMarkup,
    extraStyle: " position: relative; z-index: 1;",
  });
  const html = `<div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${SELECTED_MARKER_SIZE}px; height: ${SELECTED_MARKER_SIZE}px;">${halo}${core}</div>`;

  return buildDivIcon({
    html,
    className: "leaflet-selected-marker",
    size: SELECTED_MARKER_SIZE,
  });
}
