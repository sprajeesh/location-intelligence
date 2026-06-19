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
- A pre-downloaded LINZ NZ addresses ZIP at `docker/data/lds-nz-addresses-CSV.zip` (see [PostGIS Address Data](#postgis-address-data))

### Setup

```bash
# Clone repo
git clone git@github.com:sprajeesh/location-intelligence.git
cd location-intelligence

# Copy env files and fill in secrets
cp .env.example .env
# Edit .env and set: DB_USER, DB_PASSWORD, DATABASE_URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > apps/web/.env.local

# Copy backend env
cp .env apps/api/.env

# IMPORTANT: Prepare OSRM data (required, ~5 min, downloads 500MB NZ road data)
./scripts/setup-osrm.sh

# Build and start Docker services (Redis, PostGIS + LINZ data, OSRM)
# NOTE: PostGIS build loads ~2.6M NZ addresses from docker/data/ and builds indexes.
# First build takes 10–20 minutes.
docker compose build postgis
docker compose up -d

# Wait for services to be ready
# Check: docker compose ps (all should show "healthy")

# Backend (Terminal 1)
cd apps/api
uv sync
uv run uvicorn app.main:app --reload

# Frontend (Terminal 2)
cd apps/web
pnpm install
pnpm dev

# Open http://localhost:3000
```

**Verify everything is running:**

```bash
# Backend health
curl http://localhost:8000/health

# PostGIS address search
curl "http://localhost:8000/search/address?q=Cuba+Street+Wellington"

# OSRM route
curl "http://localhost:5000/route/v1/driving/174.76,-36.85;174.77,-36.84?steps=false"
```

⚠️ **Troubleshooting:**

**Run diagnostics** (checks all services):

```bash
./scripts/diagnose.sh
```

**Common issues:**

| Issue                                | Solution                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `docker compose build postgis` fails | Ensure `docker/data/lds-nz-addresses-CSV.zip` exists (see [PostGIS Address Data](#postgis-address-data)) |
| PostGIS build takes long             | Expected — downloads 2.6M addresses and builds indexes (~10–20 min)             |
| `docker compose up` fails on `osrm`  | Run `./scripts/setup-osrm.sh` first (downloads NZ road data)                    |
| OSRM takes too long to start         | Normal; OSRM loads large dataset into memory on startup (~1-2 min)              |
| `Cannot GET /` in browser            | Ensure `pnpm dev` (not `pnpm build`) in `apps/web` terminal                     |
| API errors / 404s                    | Check: `curl http://localhost:8000/health` and `docker compose ps`              |
| "Cannot find module" errors          | Run `pnpm install` in `apps/web`                                                |
| "API_URL is not defined"             | Add `.env.local` to `apps/web` with `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| CORS errors in console               | Backend needs running; FastAPI CORS allows `localhost:3000`                     |

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
│  │  - Geocoding (PostGIS + Redis cache)    │   │
│  │  - Facilities (Overpass, parallel)      │   │
│  │  - Distance (OSRM + Haversine fallback) │   │
│  │  - Scoring (hybrid formula)             │   │
│  └─────────────────────────────────────────┘   │
└────┬───────────────────────┬────────────────┬───┘
     │                       │                │
┌────▼──────────┐ ┌──────────▼──────┐ ┌──────▼──────┐
│  PostGIS      │ │  Overpass API   │ │  OSRM       │
│  LINZ Address │ │  (Facilities)   │ │  (Distance) │
│  :5432        │ │                 │ │  :5000      │
└───────────────┘ └─────────────────┘ └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Redis      │
                    │  (Cache)    │
                    │  :6379      │
                    └─────────────┘
```

### Layers

| Layer        | Tech                               | Purpose                                                  |
| ------------ | ---------------------------------- | -------------------------------------------------------- |
| **Frontend** | Next.js 15 + React 19 + TypeScript | UI, address search, map interaction, i18n                |
| **BFF**      | Next.js API routes                 | Thin proxy to FastAPI, no auth/caching for MVP           |
| **Backend**  | FastAPI + Python 3.12              | Orchestration, external service calls, scoring           |
| **Map**      | React Leaflet + OpenStreetMap      | Visualization                                            |
| **State**    | Zustand + React Query              | Client-side UI state + server state                      |
| **Services** | Docker Compose                     | Redis (cache), PostGIS/LINZ (geocoding), OSRM (distance) |

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
│   │   │   ├── clients/      # External API clients (Overpass, OSRM)
│   │   │   ├── repositories/ # Cache (Redis) + DB (PostGIS address repository)
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
├── docker/
│   ├── Dockerfile.postgis    # PostGIS + LINZ NZ address data (layer 123113)
|   └── sql/
│       ├── 01_schema.sql         # addresses table definition
│       ├── 02_load.sql           # COPY command for LINZ CSV
│       └── 03_post_load.sql      # Geometry population + indexes
├── docker-compose.yml        # Redis + PostGIS + OSRM
├── scripts/
│   ├── setup-osrm.sh         # Download NZ OSRM road data
│   └── diagnose.sh           # Service health diagnostics
├── turbo.json                # Turborepo config
├── pnpm-workspace.yaml       # pnpm workspaces
├── CLAUDE.md                 # Project memory + frontend spec
├── SPEC.md                   # Original product spec
└── .env.example              # Environment variables template
```

---

## Features

### 🔍 Address Search

- Autocomplete against official LINZ NZ Street Address dataset (~2.6M addresses)
- Trigram-indexed PostgreSQL search — handles macrons and partial matches
- 300ms debounce for responsive UX
- Top 5 suggestions, results cached for 30 days in Redis

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

**Docker build + services:**

```env
DB_USER=gisuser
DB_PASSWORD=your_secure_password
```

**Backend (FastAPI):**

```env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://gisuser:your_secure_password@localhost:5432/gis
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

> ⚠️ Never commit `.env` to version control — it contains secrets. Only `.env.example` (with placeholder values) is committed.

---

## Development Workflow

### 1. Build and start services

```bash
# Build PostGIS image (only needed once, or when SQL/CSV changes)
docker compose build postgis

docker compose up -d
docker compose ps  # Verify all services are healthy
```

**Service endpoints:**

- Redis: `localhost:6379`
- PostGIS: `localhost:5432` (database: `gis`, user: `$DB_USER`)
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
curl "http://localhost:8000/search/address?q=Cuba+Street+Wellington"
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

## PostGIS Address Data

Address search is powered by the [LINZ NZ Street Address](https://data.linz.govt.nz/layer/123113-nz-street-address/) dataset (layer 123113), loaded into PostGIS at Docker image build time.

### How it works

1. `docker compose build postgis` extracts `docker/data/lds-nz-addresses-CSV.zip` and bakes the data into the image — no network access required at build time.
2. The `addresses` table is indexed with a GIN trigram index on `full_address_ascii`, enabling fast `ILIKE` search that handles macrons (searching `Otahuhu` finds `Ōtāhuhu`).
3. The `GeocodingService` queries PostGIS and caches results in Redis for 30 days.

### Obtaining the address data

Download the LINZ NZ Street Address dataset (layer 123113) from the [LINZ Data Service](https://data.linz.govt.nz/layer/123113-nz-street-addresses/) and save the ZIP as `docker/data/lds-nz-addresses-CSV.zip`. This file is gitignored due to its size (~100MB).

### Rebuilding with fresh data

```bash
# Replace docker/data/lds-nz-addresses-CSV.zip with a newer download, then:
docker compose build --no-cache postgis
docker compose up -d postgis
```

### Verifying the data loaded correctly

```bash
psql -h localhost -U $DB_USER -d gis -c "SELECT count(*) FROM addresses;"
# Expected: ~2,600,000 rows

psql -h localhost -U $DB_USER -d gis \
  -c "SELECT full_address, shape_x, shape_y FROM addresses WHERE full_address_ascii ILIKE 'cuba%' LIMIT 5;"
```

> **Note on CSV column order:** `docker/02_load.sql` uses an explicit column list. If the LINZ export format changes, verify the CSV header order matches. Inspect with:
>
> ```bash
> head -1 /path/to/downloaded.csv
> ```

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
  {
    "displayName": "123 Queen Street, Auckland",
    "lat": -36.848,
    "lon": 174.763
  }
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
  "location": {
    "lat": -36.848,
    "lon": 174.763,
    "displayName": "123 Queen Street, Auckland"
  },
  "features": [
    {
      "id": "osm_node_12345",
      "name": "Auckland Grammar School",
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

**Full API documentation:** Visit http://localhost:8000/docs (Swagger UI) when backend is running.

---

## Caching Strategy

| Data                | Cache Key                                  | TTL      |
| ------------------- | ------------------------------------------ | -------- |
| Geocoding results   | `geocode:{query_hash}`                     | 30 days  |
| Overpass facilities | `overpass:{lat}:{lon}:{radius}:{category}` | 24 hours |
| OSRM distances      | `osrm:{origin_hash}:{dest_hash}:{mode}`    | 24 hours |

- Scores are **NOT cached** (computed from cached facility data on-the-fly)
- Redis unavailable: **graceful skip** — API still works without caching

---

## Error Handling

| Scenario                 | Behavior                                           |
| ------------------------ | -------------------------------------------------- |
| Address not found        | 404 with friendly message                          |
| No facilities in radius  | 200 with empty features + suggestion               |
| Overpass partial failure | Retry 2× with backoff → partial results + warnings |
| Overpass total failure   | 503 with sanitized message                         |
| OSRM unavailable         | Fallback to Haversine + warning                    |
| Rate limits              | 429 with `Retry-After` header                      |

**All error messages** are sanitized — no stack traces, internal URLs, or service names leak to clients.

---

## Testing

### Backend

```bash
cd apps/api
uv run pytest                          # All 45 tests
uv run pytest tests/test_scoring.py -v # Scoring formula tests
uv run pytest tests/test_distance.py -v # Haversine tests
uv run pytest tests/test_api.py -v     # Integration tests
uv run ruff check app/                 # Lint
```

**Test coverage:**

- LocationScoringService formula (edge cases, zero facilities, null weights)
- Haversine distance calculation
- `/health` and `/categories` endpoint integration tests
- Address search endpoint (mocked `AddressRepository`)

Tests use a mocked `AddressRepository` — no live database connection required.

### Frontend

```bash
cd apps/web
pnpm test
pnpm lint
```

---

## Performance

| Metric               | Target  | Notes                                |
| -------------------- | ------- | ------------------------------------ |
| Address autocomplete | < 1 sec | PostGIS trigram search + Redis cache |
| Full analysis        | < 3 sec | Parallel Overpass queries            |
| Map render           | < 2 sec | Client-side only                     |
| Max markers          | 500     | Clustering > 50                      |

---

## Deployment

| Component | Target          | Notes                                                      |
| --------- | --------------- | ---------------------------------------------------------- |
| Frontend  | Vercel          | `next build` → auto-deploy on main                         |
| Backend   | AWS ECS Fargate | Docker image, FastAPI                                      |
| Services  | Managed         | Redis (ElastiCache), PostGIS (container), OSRM (container) |

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
# Check PostGIS is ready
pg_isready -h localhost -p 5432 -U $DB_USER -d gis

# Check OSRM
curl http://localhost:5000/health

# Check Redis
redis-cli ping
```

### Map not rendering

- Ensure `ssr: false` on MapView dynamic import
- Check browser console for Leaflet CSS import errors
- Verify `NEXT_PUBLIC_API_URL` env var is set

### Autocomplete returns no results

- Verify PostGIS is running: `docker compose ps`
- Check data loaded: `psql -h localhost -U $DB_USER -d gis -c "SELECT count(*) FROM addresses;"`
- Check PostGIS logs: `docker compose logs postgis`

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
