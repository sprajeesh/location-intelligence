/**
 * Colorblind-safe sequential severity scale (ColorBrewer RdYlBu, reversed)
 * for the hazard map layer: cold/blue = safe, warm/red = severe. Single
 * source of truth for both the map layer's fill color and the legend, so
 * they can never drift apart.
 */
export interface HazardColorStop {
  max: number
  color: string
  label: string
}

export const HAZARD_COLOR_STOPS: HazardColorStop[] = [
  { max: 14, color: "#2166ac", label: "Very low" },
  { max: 28, color: "#67a9cf", label: "Low" },
  { max: 42, color: "#d1e5f0", label: "Low-moderate" },
  { max: 57, color: "#f7f7f7", label: "Moderate" },
  { max: 71, color: "#fddbc7", label: "Moderate-high" },
  { max: 85, color: "#ef8a62", label: "High" },
  { max: 100, color: "#b2182b", label: "Severe" },
]

const FALLBACK_COLOR = HAZARD_COLOR_STOPS[HAZARD_COLOR_STOPS.length - 1]!.color

export function getHazardCellColor(compositeScore: number): string {
  const stop = HAZARD_COLOR_STOPS.find((s) => compositeScore <= s.max)
  return stop?.color ?? FALLBACK_COLOR
}
