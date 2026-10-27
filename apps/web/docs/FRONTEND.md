# Frontend notes

UI behaviour and rules for `apps/web/`. Stack, structure, setup and error-reporting details: [`apps/web/README.md`](../README.md). Agent-facing commands and gotchas: root `AGENTS.md`.

## Layout — Desktop

```
┌─────────────────────────────────────────────────────┐
│  [🔍 Search address...  ▾ 10km] [Driving|Walking] [Analyze] │  ← floating top bar
├────────────────┬────────────────────────────────────┤
│                │                                    │
│  Results Panel │           MAP                      │
│  (collapsible) │      (full width behind)           │
│                │                                    │
│  ▸ Schools (3) │                                    │
│  ▸ Bus Stops(7)│                                    │
│                │                                    │
│  ── Score ──   │                                    │
│  Overall: 77   │                                    │
│  (2/4 cats)    │                                    │
└────────────────┴────────────────────────────────────┘
```

## Layout — Mobile

Below `md`, once an address is selected the map is a full-bleed backdrop and
nothing else swaps it out:

- **Top bar** (floating): the address search. A hamburger `MobileMenu` sits inside
  the field's left edge (Theme, Scoring, Language and
  the site links) and the lens is a submit button at the right end, before the
  clear (X) once there is text.
  The footer is desktop-only.
- **Results sheet** (`ResultsSheet`): a bottom sheet with `peek` (~104px, address
  plus an icon-only Report button pinned to the right of that row, outside the drag handle so
  tapping it never moves the sheet), `half` (default after a search) and `full` snap points. Only the
  handle drags (tap cycles, arrow keys step), so the list inside scrolls normally.
  The sheet sits `MAP_EDGE_GAP_PX` (16px) above the map's bottom edge so the scale bar and attribution stay visible.
  State lives in the store as `sheetSnap`; `isMapViewOnMobile` is true exactly at
  `peek`. Showing a marker or tapping a facility drops the sheet to `peek`.
- **Map camera** keeps its target clear of the sheet via `mapBottomInsetPx`
  (see `useMapViewportSync`).
- **Map toolbar** shows Locate and a "more" button; the rest folds away.
- Touch targets are 44px and inputs are 16px below `md` (prevents iOS focus zoom).

Before an address is selected the search floats over the map as before.

## Theme

Solid, light-first UI with an opt-in dark toggle (`ThemeToggle`, persisted via
`useLocationStore`). Only isolated surfaces (e.g. the score hero card's
`.surface-glass-primary`) use a translucent/backdrop-blur treatment; panels are opaque.

- **Brand colors**: single source of truth is `apps/web/src/styles/tokens.ts`
  (hex scales for `primary`/`success`/`warning`/`error`, plus `info` aliased
  to `primary` and `ink` for high-contrast text). `tailwind.config.ts` imports
  it and wires each shade to a CSS variable, so Tailwind classes
  (`bg-primary-500`, `text-error-600`, …) resolve through
  `rgb(var(--color-x-500) / <alpha-value>)`.
- **Dark mode**: the actual RGB values (light in `:root`, dark in `:root.dark`)
  live in `src/i18n/globals.css`. Dark mode is a deliberate re-theme, not an
  auto-invert — `primary` swaps to a distinct teal accent, while
  `success`/`warning`/`error`/`slate` mirror shade-roles (50↔900, 100↔800, …).
  Non-Tailwind consumers (Leaflet `divIcon` HTML strings and GeoJSON `style()`
  callbacks in `MapContainer.tsx`) reference `rgb(var(--color-x-500))`
  directly so they re-theme along with everything else — avoid literal CSS
  colors (`white`, `black`, `rgba(0,0,0,...)`) in that file; use the
  corresponding `--color-*` var instead, and match the `boxShadow` tokens'
  `rgba(16,24,40,x)` convention for shadow color rather than plain black.
- Font: Plus Jakarta Sans (via `next/font/google`)
- Subtle micro-animations on interactions

## Map behavior

- `containers/MapContainer/index.tsx` loads `MapContainer.tsx` via `dynamic(..., { ssr: false })` — no SSR
- Import `leaflet/dist/leaflet.css` inside the component
- Leaflet default icon URLs are fixed in `MapContainer.tsx` with `L.Icon.Default.mergeOptions` and `require`d marker images. Keep that when touching icons; the old `_getIconUrl` deletion is no longer used
- Main location marker: red/accent colored pin
- Category marker colors come from `/categories` API response (`color` field)
  — a categorical palette hand-authored in `apps/api/app/config/scoring_config.py`
  for marker-to-marker distinctiveness, intentionally separate from the
  frontend brand tokens above
- Cluster markers when count > 50 (use `leaflet.markercluster`)
- Click marker → Leaflet popup: name, distance, category
- Fit bounds on initial search result
- Preserve zoom level on filter/visibility changes
- Max 500 markers rendered

## Map corrections

Backend contract: `apps/api/docs/API_CONTRACT.md` (`POST /map-corrections`).

- **Add:** the "Report a missing place" toolbar button enters placement mode. The next map click, or "Use map centre", sets the point and opens `MapCorrectionForm`. Escape cancels placement.
- **Address suggestions** in the add form fill the address text only. Picking one never moves the point, and its coordinates are discarded. Escape closes the dropdown without closing the form.
- **Remove:** a facility popup action ("Report this place as closed") opens the form for its OSM element. The action is hidden when the feature ID doesn't parse (`osmFeatureId.ts`). The submitted payload carries the facility's type and point as well as the OSM ID, because the API requires them for remove too (see `API_CONTRACT.md`).
- Correction state lives in the store and is not persisted. The reporter's email is held in the form only: it is never stored, logged, or put in a toast.
- Outcomes: `202` and `200` toast and close the form. `422` marks fields inline on the add form; the remove form has no fields, so it shows a generic message. `429` shows the wait. `5xx` or a network error toasts with Retry.
- Each submission mints its own correlation ID (`useMapCorrection`).

## Address search flow

1. User types → 300ms debounce → `GET /api/search/address?q=...`
2. Dropdown shows top 5 suggestions
3. User selects → store sets `selectedAddress` → `useAnalyze` mutation fires
4. Results populate panel; map fits bounds to features

## Analyze button

Explicit "Analyze" button also triggers the mutation (in addition to address selection).
Shows `"Analyzing..."` label while in-flight.

## Results panel behavior

- Collapsible group headers per category (Schools, Bus Stops)
- Each group header has a toggle to show/hide its markers on the map
- Clicking a facility item → map centers on that marker and opens its popup
- Skeleton loaders shown while `isAnalyzing` is true
- Persistent primary-colour **Generate report** button (below the scrolling score, above the radius adjuster): starts a background PDF job, shows "Generating report…", then a toast with **Download** (failures offer **Retry**). Any change to address/radius/categories resets it
- Empty state: illustration + "No facilities found within {radius}km. Try increasing your search radius." + button to auto-increase radius

## i18n

Translations live in `src/i18n/en.json`; `mi.json` mirrors its keys. Add every new string to both.

## Notifications

- Global errors (API down, rate limits): Toast/snackbar, top-right, auto-dismiss
- Contextual errors (no results, bad address): inline near the relevant component

## Loading states

- Results panel: skeleton loaders per category group while `isAnalyzing`
- Map: subtle semi-transparent overlay + spinner (non-blocking)
- Search: loading indicator in autocomplete dropdown

## Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels on map controls, search, filters, panels
- Focus management when panel opens/closes
- Screen reader support for results list

## SEO (for public-facing pages)

- Title tags, meta descriptions, OpenGraph tags, JSON-LD structured data
- Canonical URLs, single `<h1>`, semantic HTML5
