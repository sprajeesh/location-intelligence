# Location Intelligence — Project Memory

## What This Is

A production-ready MVP where users enter a New Zealand address and visualize nearby
facilities (bus stops, schools) within a configurable radius, along with a hybrid
location score. Target users: property buyers, real estate agents, renters in NZ.

---

## Monorepo Layout

```
/
├── apps/
│   ├── api/          # FastAPI backend
│   └── web/          # Next.js 16 frontend
├── packages/         # Reserved
├── scripts/
│   └── setup-osrm.sh
├── docker-compose.yml   # Redis + PostGIS + OSRM (run via docker compose up -d)
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

**Local dev workflow:** Docker services run in containers; FastAPI and Next.js run
directly on the host.

```bash
docker compose up -d                                  # Redis, PostGIS, OSRM
cd apps/api && uv run uvicorn app.main:app --reload   # FastAPI on :8000
cd apps/web && pnpm dev                               # Next.js on :3000
```

---

## Backend (`apps/api/`)

FastAPI + Python 3.13 + uv. Tests: `uv run pytest`; lint: `uv run ruff check`.

### Endpoints

| Method | Path                            | Notes                                                   |
| ------ | ------------------------------- | ------------------------------------------------------- |
| GET    | `/health`                       | `{"status": "ok", "version": <apps/api/pyproject.toml>}` |
| GET    | `/search/address?q=&country=nz` | LINZ PostGIS address search, top 5, NZ addresses        |
| GET    | `/categories`                   | All categories with `implemented` flag + marker `color` |
| POST   | `/location/analyze`             | Full analysis — geocode + Overpass + OSRM + score       |
| POST   | `/reports`                      | Start a background PDF report job → `202 {jobId}` (see `apps/api/docs/REPORTS.md`) |
| GET    | `/reports/{jobId}`              | Job status: `queued\|running\|ready\|failed`            |
| GET    | `/reports/{jobId}/download`     | The finished PDF (`409` until ready, `404` once expired) |
| GET    | `/route`                        | Turn-by-turn route to a facility (driving/walking/cycling) |
| GET    | `/category-weights`             | Per-category score weights                              |
| GET    | `/parcels`                      | Parcel lookup at a point                                |
| POST   | `/contact`                      | Contact form → emailed via Resend to `CONTACT_RECIPIENT_EMAIL` (`202`; `503` if unconfigured) |

### Key backend files

- `app/main.py` — lifespan wires all services via `app.state`, CORS allows `localhost:3000`
- `app/services/scoring.py` — isolated `LocationScoringService` (swappable formula)
- `app/clients/overpass.py` — parallel category queries, 2× retry with backoff, dedup by OSM id
- `app/clients/osrm.py` — OSRM road distance, automatic Haversine fallback + warning
- `app/repositories/cache.py` — Redis caching, silent skip when Redis unavailable

### POST /location/analyze contract

Request:

```json
{
  "address": "...",
  "lat": -36.848,
  "lon": 174.763,
  "radiusKm": 10,
  "categories": ["schools", "bus_stops"],
  "distanceMode": "driving"
}
```

`categories` is optional. If omitted entirely, the API uses the DB-configured
default facility set (currently: `schools`, `gps`, `bus_stops`,
`railway_stations`, `supermarkets` — one from education, one from
healthcare, two from transport, and the only shopping facility type;
recreation is excluded from defaults). Pass `"categories": []` explicitly to
request no facilities (score comes back with `overall: null`). Which facility
types count as defaults is DB-driven (`facility_types.is_default`, see
`apps/api/docs/DATA_MODEL.md`) — editable without a redeploy.

Response:

```json
{
  "location": { "lat": -36.848, "lon": 174.763, "displayName": "..." },
  "features": [
    {
      "id": "osm_node_12345",
      "name": "...",
      "category": "schools",
      "lat": -36.852,
      "lon": 174.77,
      "distanceKm": 1.2
    }
  ],
  "score": {
    "education": 72,
    "healthcare": null,
    "transport": 85,
    "shopping": null,
    "overall": 77,
    "coverage": "2/4"
  },
  "warnings": []
}
```

### GET /categories response

Returns every facility type (12 currently), for example:

```json
[
  { "id": "schools", "label": "Schools", "implemented": true, "color": "#F59E0B", "isDefault": true },
  { "id": "bus_stops", "label": "Bus Stops", "implemented": true, "color": "#14B8A6", "isDefault": true }
]
```

---

## Frontend (`apps/web/`)

Exact dependency versions: `apps/web/package.json`.

### Tech stack

| Layer           | Choice                                              |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 16 (App Router)                             |
| Language        | TypeScript + React 19.0.0                           |
| Map             | React Leaflet 4 + Leaflet 1.9 + OpenStreetMap tiles |
| Server state    | TanStack React Query v5.101.1                       |
| UI state        | Zustand v5                                          |
| i18n            | next-intl v4 (URL-based: `/en/...`, `/mi/...`)      |
| Testing         | Jest 29 + @testing-library/react v16.3.2            |
| Linting         | ESLint 9 + eslint-config-next                       |
| Package manager | pnpm                                                |

### Structure

- `src/app` — App Router; `[locale]/` pages (home, about, faq, data-sources); `api/*` BFF routes
  forwarding to FastAPI; `robots.ts`, `sitemap.ts`
- `src/containers/*` — wire store ↔ hooks ↔ components (e.g. `MapContainer`, `AnalysisContainer`)
- `src/components/*` — presentational components, one folder each
- `src/hooks`, `src/services/api.ts` (typed BFF fetch wrappers), `src/store/index.ts` (Zustand)
- `src/types/api.ts` — TypeScript types matching backend responses; keep in sync with the API schemas
- `src/i18n` — `routing.ts`, `request.ts`, `en.json`, `mi.json`, `globals.css`
- `src/styles/tokens.ts` — brand color tokens
- `src/middleware.ts` — next-intl routing

Package name: `@location-intelligence/web`. Store, hooks and components sit next to their tests;
read the source for their current shape.

### Layout — Desktop

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

### Layout — Mobile

Results panel becomes a draggable bottom sheet. Map occupies most of the screen.

### Theme

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
- Font: Inter (via `next/font/google`)
- Subtle micro-animations on interactions

### Map behavior

- `containers/MapContainer/index.tsx` loads `MapContainer.tsx` via `dynamic(..., { ssr: false })` — no SSR
- Import `leaflet/dist/leaflet.css` inside the component
- Fix Leaflet default icon broken URLs in Next.js (delete `_getIconUrl`, set `iconUrl` manually)
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

### BFF proxy routes (Next.js API routes)

Thin pass-through — forward query params and body, relay FastAPI response verbatim.
No transformation, no caching, no auth for MVP.
`NEXT_PUBLIC_API_URL` env var points to FastAPI (`http://localhost:8000`).

### Address search flow

1. User types → 300ms debounce → `GET /api/search/address?q=...`
2. Dropdown shows top 5 suggestions
3. User selects → store sets `selectedAddress` → `useAnalyze` mutation fires
4. Results populate panel; map fits bounds to features

### Analyze button

Explicit "Analyze" button also triggers the mutation (in addition to address selection).
Shows `"Analyzing..."` label while in-flight.

### Results panel behavior

- Collapsible group headers per category (Schools, Bus Stops)
- Each group header has a toggle to show/hide its markers on the map
- Clicking a facility item → map centers on that marker and opens its popup
- Skeleton loaders shown while `isAnalyzing` is true
- Persistent primary-colour **Generate report** button (below the scrolling score, above the radius adjuster): starts a background PDF job, shows "Generating report…", then a toast with **Download** (failures offer **Retry**). Any change to address/radius/categories resets it
- Empty state: illustration + "No facilities found within {radius}km. Try increasing your search radius." + button to auto-increase radius

### i18n

Translations live in `src/i18n/en.json`; `mi.json` mirrors its keys. Add every new string to both.

### Notifications

- Global errors (API down, rate limits): Toast/snackbar, top-right, auto-dismiss
- Contextual errors (no results, bad address): inline near the relevant component

### Loading states

- Results panel: skeleton loaders per category group while `isAnalyzing`
- Map: subtle semi-transparent overlay + spinner (non-blocking)
- Search: loading indicator in autocomplete dropdown

### Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels on map controls, search, filters, panels
- Focus management when panel opens/closes
- Screen reader support for results list

### Tests (Jest + @testing-library/react)

- Unit: components, hooks, utility functions
- Integration: key user flows with mocked API responses
- Colocated next to source files

### SEO (for public-facing pages)

- Title tags, meta descriptions, OpenGraph tags, JSON-LD structured data
- Canonical URLs, single `<h1>`, semantic HTML5

### Performance targets

| Metric               | Target  |
| -------------------- | ------- |
| Address autocomplete | < 1 sec |
| Full analysis API    | < 3 sec |
| Map initial render   | < 2 sec |
| Max markers on map   | 500     |

---

## Environment Variables

```env
# Backend (apps/api/.env or root .env)
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://gisuser:changeme@localhost:5432/gis
OVERPASS_URL=https://overpass-api.de/api/interpreter
OSRM_URL=http://localhost:5000
OSRM_FOOT_URL=http://localhost:5001
OSRM_BIKE_URL=http://localhost:5002
REDIS_URL=redis://localhost:6379
REPORT_TTL_SECONDS=3600
REPORT_MAX_IN_FLIGHT=2
REPORT_RENDER_TIMEOUT_SECONDS=60
RATE_LIMIT_REPORT_TIMES=5
RATE_LIMIT_REPORT_SECONDS=60
# Contact form (all optional locally; POST /contact returns 503 until set)
CONTACT_RECIPIENT_EMAIL=
RESEND_API_KEY=
# CONTACT_FROM_EMAIL=onboarding@resend.dev  (default; Resend test sender)
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10

# Frontend (apps/web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Git / Remote

- Remote: `git@github.com:sprajeesh/location-intelligence.git`
- Default branch: `main`; use feature branches and PRs
