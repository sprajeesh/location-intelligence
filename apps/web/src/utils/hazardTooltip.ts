import type { HazardCellFeature } from "@/types/hazard"

/**
 * Escapes a string for safe interpolation into an HTML string. Needed
 * because buildHazardTooltipHtml below builds a raw HTML string (not JSX)
 * that's passed straight to Leaflet's bindTooltip -- unlike JSX, nothing
 * here auto-escapes interpolated values.
 */
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/**
 * Builds the hover tooltip HTML for one hazard cell -- a plain HTML string
 * (bound via Leaflet's native bindTooltip), not JSX, matching how the
 * marker icons in MapContainer are already built as HTML strings rather
 * than React elements rendered through Leaflet. Kept in its own module
 * (rather than inline in MapContainer.tsx) so it can be unit tested without
 * pulling in react-leaflet, which Jest can't transform.
 */
export function buildHazardTooltipHtml(props: HazardCellFeature["properties"]): string {
  const rows = props.hazards
    .map(
      (h) => `
        <div style="display:flex;justify-content:space-between;gap:8px;">
          <span style="text-transform:capitalize;">${escapeHtml(h.hazardType)}${h.isProxy ? " (proxy)" : ""}</span>
          <span>${Math.round(h.score)}</span>
        </div>`,
    )
    .join("")

  return `
    <div style="font-size:12px;min-width:140px;">
      <div style="font-weight:600;margin-bottom:4px;">
        Composite: ${Math.round(props.composite)} · Worst: ${Math.round(props.worstHazard)}
      </div>
      ${rows}
    </div>
  `
}
