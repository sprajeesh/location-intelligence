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
│   ├── api/          # FastAPI backend — DONE
│   └── web/          # Next.js 16.2.9 frontend — BUILT
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

## Backend — COMPLETE (`apps/api/`)

FastAPI + Python 3.12 + uv. All 45 tests pass, ruff clean.

### Endpoints

| Method | Path                            | Notes                                                   |
| ------ | ------------------------------- | ------------------------------------------------------- |
| GET    | `/health`                       | `{"status": "ok", "version": "1.0.0"}`                  |
| GET    | `/search/address?q=&country=nz` | LINZ PostGIS address search, top 5, NZ addresses        |
| GET    | `/categories`                   | All categories with `implemented` flag + marker `color` |
| POST   | `/location/analyze`             | Full analysis — geocode + Overpass + OSRM + score       |

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

```json
[
  {
    "id": "schools",
    "label": "Schools",
    "implemented": true,
    "color": "#F59E0B"
  },
  {
    "id": "bus_stops",
    "label": "Bus Stops",
    "implemented": true,
    "color": "#14B8A6"
  },
  {
    "id": "hospitals",
    "label": "Hospitals",
    "implemented": false,
    "color": "#EF4444"
  },
  {
    "id": "universities",
    "label": "Universities",
    "implemented": false,
    "color": "#8B5CF6"
  },
  {
    "id": "supermarkets",
    "label": "Supermarkets",
    "implemented": false,
    "color": "#10B981"
  },
  { "id": "parks", "label": "Parks", "implemented": false, "color": "#22C55E" },
  {
    "id": "libraries",
    "label": "Libraries",
    "implemented": false,
    "color": "#3B82F6"
  },
  {
    "id": "pharmacies",
    "label": "Pharmacies",
    "implemented": false,
    "color": "#EC4899"
  }
]
```

---

## Frontend — COMPLETE (`apps/web/`)

### Tech stack

| Layer           | Choice                                                      |
| --------------- | ----------------------------------------------------------- |
| Framework       | Next.js 16.2.9 (Active LTS, App Router)                    |
| Language        | TypeScript + React 19.0.0                                   |
| Map             | React Leaflet 4 + Leaflet 1.9 + OpenStreetMap tiles         |
| Server state    | TanStack React Query v5.101.1                               |
| UI state        | Zustand v5                                                  |
| i18n            | next-intl v3 (URL-based: `/en/...`, `/mi/...`)              |
| Testing         | Jest 29 + @testing-library/react v16.3.2                    |
| Linting         | ESLint 9.20 + eslint-config-next 16.2.9                     |
| Package manager | pnpm                                                        |

### Directory structure to create

```
apps/web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── jest.config.ts
├── jest.setup.ts
├── src/
│   ├── proxy.ts               # next-intl routing proxy (Next.js 16 convention)
│   ├── app/
│   │   ├── layout.tsx             # Root layout (minimal, for next-intl)
│   │   ├── api/
│   │   │   ├── search/address/route.ts      # BFF proxy → FastAPI /search/address
│   │   │   ├── location/analyze/route.ts    # BFF proxy → FastAPI /location/analyze
│   │   │   └── categories/route.ts          # BFF proxy → FastAPI /categories
│   │   └── [locale]/
│   │       ├── layout.tsx         # Locale layout with QueryClient + Zustand providers
│   │       ├── page.tsx           # Main page
│   │       └── not-found.tsx
│   ├── components/
│   │   ├── SearchBar.tsx          # Floating search + autocomplete dropdown
│   │   ├── MapView.tsx            # React Leaflet map (Client Component, ssr:false)
│   │   ├── ResultsPanel.tsx       # Left panel (desktop) / bottom sheet (mobile)
│   │   ├── CategoryGroup.tsx      # Collapsible group with map visibility toggle
│   │   ├── FacilityItem.tsx       # Single facility row (name + distance)
│   │   ├── ScoreDisplay.tsx       # Score section in panel
│   │   ├── LoadingSkeleton.tsx    # Skeleton loaders for panel
│   │   ├── Toast.tsx              # Global error toast (top-right, auto-dismiss)
│   │   └── DistanceToggle.tsx     # Driving / Walking toggle
│   ├── containers/
│   │   ├── SearchContainer.tsx    # Wires SearchBar ↔ store ↔ analyze mutation
│   │   └── AnalysisContainer.tsx  # Wires ResultsPanel ↔ store ↔ map
│   ├── hooks/
│   │   ├── useAddressSearch.ts    # 300ms debounced autocomplete query
│   │   ├── useAnalyze.ts          # React Query mutation for /location/analyze
│   │   └── useMapState.ts         # Map center/zoom state
│   ├── services/
│   │   └── api.ts                 # Typed fetch wrappers for BFF proxy routes
│   ├── store/
│   │   └── index.ts               # Zustand store (see shape below)
│   ├── types/
│   │   └── api.ts                 # TypeScript types matching backend responses
│   └── i18n/
│       ├── routing.ts             # next-intl routing config
│       ├── request.ts             # next-intl server request config
│       ├── en.json                # Full English translations
│       └── mi.json                # Māori — same keys, placeholder values
```

### package.json name

`@location-intelligence/web`

### Zustand store shape

```typescript
{
  selectedAddress: AddressResult | null
  radiusKm: number                    // default 10
  distanceMode: 'driving' | 'walking'
  analysisResult: AnalyzeResponse | null
  isAnalyzing: boolean
  visibleCategories: Set<string>      // which category markers shown on map
  // actions
  setSelectedAddress: (addr: AddressResult | null) => void
  setRadiusKm: (r: number) => void
  setDistanceMode: (m: 'driving' | 'walking') => void
  setAnalysisResult: (r: AnalyzeResponse | null) => void
  setIsAnalyzing: (b: boolean) => void
  toggleCategoryVisibility: (cat: string) => void
}
```

### TypeScript types (types/api.ts) — must match backend exactly

```typescript
export interface AddressResult {
  displayName: string;
  lat: number;
  lon: number;
}
export interface Feature {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distanceKm: number;
}
export interface ScoreResult {
  education: number | null;
  healthcare: number | null;
  transport: number | null;
  shopping: number | null;
  overall: number | null;
  coverage: string;
}
export interface AnalyzeResponse {
  location: { lat: number; lon: number; displayName: string };
  features: Feature[];
  score: ScoreResult;
  warnings: string[];
}
export interface Category {
  id: string;
  label: string;
  implemented: boolean;
  color: string;
}
```

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

- **Dark mode** with glassmorphism: `rgba` backgrounds + `backdrop-filter: blur`
- Background: `#0f1117` or similar dark
- Panels: semi-transparent over the map
- Font: Inter (via `next/font/google`)
- Subtle micro-animations on interactions

### Map behavior

- `dynamic(() => import('./MapView'), { ssr: false })` — no SSR
- Import `leaflet/dist/leaflet.css` inside the component
- Fix Leaflet default icon broken URLs in Next.js (delete `_getIconUrl`, set `iconUrl` manually)
- Main location marker: red/accent colored pin
- Category marker colors come from `/categories` API response (`color` field)
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
- Empty state: illustration + "No facilities found within {radius}km. Try increasing your search radius." + button to auto-increase radius

### i18n keys (en.json — must be complete; mi.json same keys)

```json
{
  "search": {
    "placeholder": "Search a New Zealand address...",
    "loading": "Searching...",
    "noResults": "No results found"
  },
  "radius": {
    "label": "Radius",
    "options": {
      "1km": "1 km",
      "5km": "5 km",
      "10km": "10 km",
      "20km": "20 km",
      "custom": "Custom"
    }
  },
  "analyze": { "button": "Analyze", "loading": "Analyzing..." },
  "results": {
    "title": "Results",
    "noFacilities": "No facilities found within {radius}km. Try increasing your search radius.",
    "schools": "Schools",
    "busStops": "Bus Stops"
  },
  "score": {
    "title": "Location Score",
    "overall": "Overall",
    "coverage": "Based on {count} of {total} categories",
    "education": "Education",
    "transport": "Transport",
    "healthcare": "Healthcare",
    "shopping": "Shopping"
  },
  "distance": {
    "driving": "Driving",
    "walking": "Walking",
    "km": "{distance} km"
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "apiDown": "Service temporarily unavailable.",
    "rateLimit": "Too many requests. Please wait a moment."
  },
  "map": {
    "markerPopup": {
      "name": "Name",
      "distance": "Distance",
      "category": "Category"
    }
  },
  "nav": { "title": "Location Intelligence", "language": "Language" }
}
```

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
REDIS_URL=redis://localhost:6379
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10

# Frontend (apps/web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Git / Remote

- Remote: `git@github.com:sprajeesh/location-intelligence.git`
- Default branch: `main`
- Committed so far: monorepo scaffolding + full backend + full frontend (Next.js 16)

### Changelog

| Date | Branch | Description |
| ---------- | ------------------------- | ----------- |
| 2026-06-23 | `upgrade/next-16-lts` | Upgraded Next.js 15 → 16.2.9 (Active LTS); migrated `middleware.ts` → `proxy.ts`; updated peer dependencies; resolved all TypeScript strict-mode errors |
