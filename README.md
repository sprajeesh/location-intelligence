# Location Intelligence

A production-ready MVP for analyzing property locations in New Zealand. Enter any NZ address and visualize nearby facilities (schools, bus stops) within a configurable radius, along with a hybrid location score powered by OpenStreetMap data.

**Target users:** Property buyers, real estate agents, renters in New Zealand.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- pnpm 9.15+
- Python 3.12 + uv
- Node.js 20+ (for Next.js)

### Setup (< 10 minutes)

```bash
# Clone repo
git clone git@github.com:sprajeesh/location-intelligence.git
cd location-intelligence

# Start Docker services (Redis, Photon, OSRM)
docker compose up -d

# Backend
cd apps/api
uv sync
uv run uvicorn app.main:app --reload

# Frontend (in another terminal)
cd apps/web
pnpm install
pnpm dev

# Open http://localhost:3000
```

**Verify backend health:**
```bash
curl http://localhost:8000/health
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Browser (Next.js)                │
│              http://localhost:3000              │
└──────────────────────────┬──────────────────────┘
                           │
                    BFF Proxy Routes
                           │
┌──────────────────────────▼──────────────────────┐
│          FastAPI Backend                        │
│        http://localhost:8000                    │
│  ┌─────────────────────────────────────────┐   │
│  │  Services Layer                         │   │
│  │  - Geocoding (Photon cache)             │   │
│  │  - Facilities (Overpass, parallel)      │   │
│  │  - Distance (OSRM + Haversine fallback) │   │
│  │  - Scoring (hybrid formula)             │   │
│  └─────────────────────────────────────────┘   │
└────┬───────────────────────┬────────────────┬───┘
     │                       │                │
┌────▼─────┐    ┌──────────▼──────┐  ┌──────▼──────┐
│  Photon   │    │  Overpass API   │  │  OSRM       │
│ (Geocode) │    │ (Facilities)    │  │ (Distance)  │
└───────────┘    └─────────────────┘  └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Redis      │
                    │  (Cache)    │
                    └─────────────┘
```

### Layers

| Layer | Tech | Purpose |
|---|---|---|
| **Frontend** | Next.js 15 + React 19 + TypeScript | UI, address search, map interaction, i18n |
| **BFF** | Next.js API routes | Thin proxy to FastAPI, no auth/caching for MVP |
| **Backend** | FastAPI + Python 3.12 | Orchestration, external service calls, scoring |
| **Map** | React Leaflet + OpenStreetMap | Visualization |
| **State** | Zustand + React Query | Client-side UI state + server state |
| **Services** | Docker Compose | Redis (cache), Photon (geocoding), OSRM (distance) |

---

## Project Structure

```
location-intelligence/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py       # App entry, lifespan, CORS
│   │   │   ├── api/          # Routers: /health, /search, /categories, /analyze
│   │   │   ├── services/     # Business logic
│   │   │   ├── clients/      # External API clients
│   │   │   ├── repositories/ # Cache layer
│   │   │   ├── schemas/      # Pydantic models
│   │   │   ├── models/       # Domain models
│   │   │   └── config/       # Settings
│   │   ├── tests/            # pytest suite (45 tests)
│   │   ├── pyproject.toml
│   │   └── README.md
│   └── web/                  # Next.js frontend (not yet built)
│       ├── src/
│       │   ├── app/          # App Router pages + layouts
│       │   ├── components/   # Reusable UI components
│       │   ├── containers/   # Business-logic wrappers
│       │   ├── hooks/        # Custom React hooks
│       │   ├── services/     # API client
│       │   ├── store/        # Zustand store
│       │   ├── types/        # TypeScript types
│       │   └── i18n/         # next-intl config + translations
│       ├── package.json
│       └── README.md (planned)
├── docker-compose.yml        # Redis + Photon + OSRM
├── turbo.json                # Turborepo config
├── pnpm-workspace.yaml       # pnpm workspaces
├── CLAUDE.md                 # Project memory + frontend spec
├── SPEC.md                   # Original product spec
└── .env.example              # Environment variables template
```

---

## Features

### 🔍 Address Search
- Autocomplete via self-hosted Photon (NZ-restricted)
- 300ms debounce for responsive UX
- Top 5 suggestions displayed

### 📍 Facility Discovery
- **Schools** (OSM: `amenity=school`)
- **Bus Stops** (OSM: `highway=bus_stop` or `public_transport=platform`)
- Future: Hospitals, Universities, Supermarkets, Parks, Libraries, Pharmacies

### 📏 Distance Calculation
- **Road distance** via OSRM (driving or walking)
- **Haversine fallback** if OSRM unavailable
- Configurable radius: 1km, 5km, 10km, 20km, or custom

### 🎯 Location Score
Hybrid formula combining proximity and facility density:
```
category_score = α × proximity_score + β × density_score
overall_score  = weighted average of active categories (normalized)
```
- **Education (Schools):** 40% weight
- **Transport (Bus Stops):** 30% weight
- **Healthcare, Shopping:** reserved for future categories

### 🗺️ Interactive Map
- Leaflet-based with OpenStreetMap tiles
- Category-colored markers
- Marker clustering (>50 markers)
- Max 500 markers per search
- Popup with facility details on click

### 🌍 Internationalization (i18n)
- **English** (en) — fully translated
- **Māori** (mi) — placeholder structure for future localization
- URL-based routing: `/en/...`, `/mi/...`

### 🎨 Dark Theme
- Glassmorphism design (semi-transparent panels + blur)
- Subtle micro-animations
- Responsive (desktop panel + mobile bottom sheet)

---

## Environment Setup

### Copy and edit `.env` from template
```bash
cp .env.example .env
```

**Backend (FastAPI):**
```env
API_HOST=0.0.0.0
API_PORT=8000
PHOTON_URL=http://localhost:2322
OVERPASS_URL=https://overpass-api.de/api/interpreter
OSRM_URL=http://localhost:5000
REDIS_URL=redis://localhost:6379
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10
```

**Frontend (Next.js):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Workflow

### 1. Start services
```bash
docker compose up -d
docker compose ps  # Verify all services are healthy
```

**Service endpoints:**
- Redis: `localhost:6379`
- Photon: `http://localhost:2322`
- OSRM: `http://localhost:5000`

### 2. Run backend
```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload
```

**Test the API:**
```bash
curl http://localhost:8000/health
curl http://localhost:8000/categories
curl "http://localhost:8000/search/address?q=Queen%20Street&country=nz"
```

### 3. Run frontend
```bash
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000

### 4. Run tests
```bash
# Backend
cd apps/api
uv run pytest                      # All tests
uv run pytest -xvs                 # Verbose
uv run ruff check app/             # Linting

# Frontend (when built)
cd apps/web
pnpm test
pnpm lint
```

---

## API Reference

### Health Check
```http
GET /health
```
Response: `{"status": "ok", "version": "1.0.0"}`

### Search Address (Autocomplete)
```http
GET /search/address?q=Queen%20Street&country=nz
```
Response:
```json
[
  {"displayName": "123 Queen Street, Auckland", "lat": -36.848, "lon": 174.763}
]
```

### List Categories
```http
GET /categories
```
Response:
```json
[
  {"id": "schools", "label": "Schools", "implemented": true, "color": "#F59E0B"},
  {"id": "bus_stops", "label": "Bus Stops", "implemented": true, "color": "#14B8A6"},
  ...
]
```

### Analyze Location
```http
POST /location/analyze
```
Request:
```json
{
  "address": "123 Queen Street, Auckland",
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
  "location": {"lat": -36.848, "lon": 174.763, "displayName": "123 Queen Street, Auckland"},
  "features": [
    {"id": "osm_node_12345", "name": "Auckland Grammar School", "category": "schools",
     "lat": -36.852, "lon": 174.770, "distanceKm": 1.2}
  ],
  "score": {"education": 72, "healthcare": null, "transport": 85, "shopping": null,
            "overall": 77, "coverage": "2/4"},
  "warnings": []
}
```

**Full API documentation:** Visit http://localhost:8000/docs (Swagger UI) when backend is running.

---

## Caching Strategy

| Data | Cache Key | TTL |
|---|---|---|
| Geocoding results | `geocode:{query_hash}` | 30 days |
| Overpass facilities | `overpass:{lat}:{lon}:{radius}:{category}` | 24 hours |
| OSRM distances | `osrm:{origin_hash}:{dest_hash}:{mode}` | 24 hours |

- Scores are **NOT cached** (computed from cached facility data on-the-fly)
- Redis unavailable: **graceful skip** — API still works without caching

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Address not found | 404 with friendly message |
| No facilities in radius | 200 with empty features + suggestion |
| Overpass partial failure | Retry 2× with backoff → partial results + warnings |
| Overpass total failure | 503 with sanitized message |
| OSRM unavailable | Fallback to Haversine + warning |
| Rate limits | 429 with `Retry-After` header |

**All error messages** are sanitized — no stack traces, internal URLs, or service names leak to clients.

---

## Testing

### Backend
```bash
cd apps/api
uv run pytest                      # All 45 tests
uv run pytest tests/test_scoring.py -v  # Scoring formula tests
uv run pytest tests/test_distance.py -v # Haversine tests
uv run pytest tests/test_api.py -v     # Integration tests
uv run ruff check app/             # Lint
```

**Test coverage:**
- LocationScoringService formula (edge cases, zero facilities, null weights)
- Haversine distance calculation
- `/health` and `/categories` endpoint integration tests

### Frontend
```bash
cd apps/web
pnpm test
pnpm lint
```

---

## Performance

| Metric | Target | Notes |
|---|---|---|
| Address autocomplete | < 1 sec | Photon cached |
| Full analysis | < 3 sec | Parallel Overpass queries |
| Map render | < 2 sec | Client-side only |
| Max markers | 500 | Clustering > 50 |

---

## Deployment

| Component | Target | Notes |
|---|---|---|
| Frontend | Vercel | `next build` → auto-deploy on main |
| Backend | AWS ECS Fargate | Docker image, FastAPI |
| Services | Managed | Redis (ElastiCache), OSRM (container), Photon (container) |

(Not yet deployed; MVP runs locally)

---

## Future Enhancements (Post-MVP)

- ✅ Schools + Bus Stops (done)
- ⏳ All 14 facility categories (Hospitals, Universities, Supermarkets, etc.)
- ⏳ Authentication & user preferences
- ⏳ Save/share location reports
- ⏳ Property listing API integration
- ⏳ Crime data overlay
- ⏳ Drive-time isochrone visualization
- ⏳ Professional Māori translations
- ⏳ Navigation links (Google Maps directions)

---

## Contributing

1. **Branch naming:** `feature/`, `bugfix/`, `docs/`
2. **Commits:** Atomic, logically grouped, conventional commit format
3. **Testing:** All tests pass before pushing
4. **Linting:** `ruff check` (backend), `eslint` (frontend)

---

## Troubleshooting

### Backend won't start
```bash
# Check Redis
redis-cli ping

# Check Photon
curl http://localhost:2322/api?q=test

# Check OSRM
curl http://localhost:5000/health
```

### Map not rendering
- Ensure `ssr: false` on MapView dynamic import
- Check browser console for Leaflet CSS import errors
- Verify `NEXT_PUBLIC_API_URL` env var is set

### Autocomplete returns no results
- Verify Photon is running: `docker compose ps`
- Check Photon logs: `docker compose logs photon`

### Distances show as straight-line (Haversine)
- OSRM likely unavailable (check `docker compose logs osrm`)
- API returns warning: check response `warnings` array

---

## License

MIT

---

## Contact

- **Project:** Location Intelligence MVP
- **Team:** LINZ / Prajeesh Koothupalakkal
- **Email:** PKoothupalakkal@linz.govt.nz
