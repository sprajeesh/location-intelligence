# Location Intelligence — FastAPI Backend

Production-ready FastAPI service for location-based facility analysis and scoring.
Handles geocoding (LINZ PostGIS), Overpass queries, distance calculation, caching, and hybrid scoring.

**Framework:** FastAPI 0.115+  
**Language:** Python 3.13  
**Package Manager:** uv  
**Testing:** pytest (197 tests)  
**Linting:** Ruff

**Docs:** [How an address gets scored](docs/SCORING.md) — a plain-language explanation of the scoring engine, no code required. [Database tables](docs/DATA_MODEL.md) — schema for `addresses`, `facility_types`, `category_weights`. [How the API is protected](docs/PROTECTION.md) — rate limiting, circuit breakers, concurrency limits, and input validation. [Hazard data sources](docs/HAZARD_SOURCES.md) — hazard data source verification and Phase-0 scaffold.

---

## Index

**Getting Started**
- [Quick Start](#quick-start) — Setup, run, test, and view API docs
- [Architecture](#architecture) — Layered design and directory structure

**Implementation Details**
- [Key Components](#key-components) — Settings, main app, repositories, clients, services, and endpoints
- [Database Migrations](#database-migrations) — Alembic migrations and hazard demo data setup
- [PostGIS Address Data](#postgis-address-data) — How LINZ data loads and gets indexed

**Quality & Deployment**
- [Error Handling](#error-handling) — Sanitization, scenarios, and edge cases
- [Testing](#testing) — Unit and integration tests, coverage
- [Linting & Formatting](#linting--formatting) — Ruff configuration
- [Performance Considerations](#performance-considerations) — Caching, parallelization, timeouts
- [Deployment](#deployment) — Docker build and environment setup
- [Logging & Observability](#logging--observability) — Structured logging and health checks

**Troubleshooting & Development**
- [Troubleshooting](#troubleshooting) — Common issues and solutions
- [Development Tips](#development-tips) — Debug mode, testing, Swagger UI
- [Contributing](#contributing) — Code style and best practices
- [References](#references) — External documentation and resources

---

## Quick Start

### Setup

```bash
# Install dependencies
uv sync

# Create .env (copy from root)
cp ../.env .env

# Run database migrations (creates + seeds facility_types/category_weights —
# the API fails to start without these tables, see "Database Migrations" below)
uv run alembic upgrade head

# Run server
uv run uvicorn app.main:app --reload
```

Server runs on http://localhost:8000

### LINZ API Key (Local Development)

The API uses the LINZ Data Service Query API for cadastral parcel lookups (via `GET /parcels`). For local development:

1. **Request a development key** from your team lead or LINZ Data Service (use a test/development key, not production)

2. **Create `.env.local`** with your key (this file is gitignored and never committed):
   ```bash
   # In apps/api/
   echo "LINZ_API_KEY=<your-development-key>" > .env.local
   ```

3. **Verify setup**:
   ```bash
   curl "http://localhost:8000/parcels?lat=-36.848&lon=174.763"
   # Should return a GeoJSON Feature representing the nearest parcel
   ```

**Why `.env.local`?**  
The root `.env` has `LINZ_API_KEY=` (empty placeholder) and is committed to git. Pydantic automatically merges `.env` and `.env.local`, with `.env.local` taking precedence — this keeps secrets out of git while allowing local development. Same pattern used by the frontend (`apps/web/.env.local`).

### Test Health

```bash
curl http://localhost:8000/health
# {"status": "ok", "version": "1.0.0"}
```

### View API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Architecture

### Layered Design

```
┌─────────────────────────────────────────┐
│         FastAPI Router Layer             │
│  /health  /search  /categories  /analyze │
└────────┬────────────────┬────────────────┘
         │                │
┌────────▼────────┐  ┌────▼──────────────┐
│ Service Layer   │  │ Dependency Injection
│                 │  │ (lifespan wiring)
│ - Geocoding     │
│ - Facilities    │
│ - Distance      │
│ - Scoring       │
└────────┬────────┘
         │
┌────────▼────────────────────────────────┐
│      Repository & Client Layer          │
│ ┌────────────────┐  ┌──────────┐  ┌────────┐ │
│ │ Address        │  │ Overpass │  │ OSRM   │ │
│ │ Repository     │  │ Client   │  │ Client │ │
│ │ (PostGIS)      │  │          │  │        │ │
│ └────────────────┘  └──────────┘  └────────┘ │
│                                              │
│ ┌──────────────┐     ┌──────────────────────┐ │
│ │ LINZ Client  │     │ Cache Repository     │ │
│ │ (parcels)    │     │ (Redis)              │ │
│ └──────────────┘     └──────────────────────┘ │
└──────────────────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│      External Services                  │
│ PostGIS  Overpass  OSRM  LINZ  Redis    │
└─────────────────────────────────────────┘
```

### Directory Structure

```
app/
├── __init__.py
├── main.py                 # FastAPI app, lifespan, CORS, routers
├── api/                    # Routers (endpoints)
│   ├── __init__.py
│   ├── health.py           # GET /health
│   ├── search.py           # GET /search/address
│   ├── categories.py       # GET /categories
│   ├── parcels.py          # GET /parcels
│   └── analyze.py          # POST /location/analyze
├── services/               # Business logic (pure, no HTTP)
│   ├── __init__.py
│   ├── geocoding.py        # Orchestrates PostGIS address search + cache
│   ├── facilities.py       # Orchestrates Overpass (parallel) + cache
│   ├── distance.py         # Orchestrates OSRM + fallback
│   └── scoring.py          # LocationScoringService (isolated formula)
├── clients/                # HTTP clients for external services
│   ├── __init__.py
│   ├── overpass.py         # OverpassQL facility queries
│   ├── osrm.py             # Road distance routing
│   ├── linz.py             # LINZ parcel lookups
│   └── redis_client.py     # Redis async singleton
├── repositories/           # Data access abstractions
│   ├── __init__.py
│   ├── cache.py            # Redis-backed caching
│   └── db/
│       ├── connection.py           # asyncpg pool create/close
│       └── address_repository.py  # LINZ address search (PostGIS)
├── schemas/                # Pydantic models (request/response)
│   ├── __init__.py
│   ├── requests.py         # AnalyzeRequest, etc.
│   └── responses.py        # AnalyzeResponse, LocationResult, etc.
├── models/                 # Domain models (dataclasses, not ORM)
│   ├── __init__.py
│   └── domain.py           # Facility, Location, CategoryScore, etc.
└── config/                 # Configuration & settings
    ├── __init__.py
    └── settings.py         # Pydantic BaseSettings (env vars)

tests/
├── __init__.py
├── conftest.py             # pytest fixtures
├── test_api.py             # Integration tests (/health, /categories)
├── test_scoring.py         # Unit tests (LocationScoringService)
├── test_distance.py        # Unit tests (Haversine)
├── test_linz_client.py     # Unit tests (LinzClient)
└── test_parcels_api.py     # Integration tests (/parcels)
```

---

## Key Components

### 1. Settings (`app/config/settings.py`)

Pydantic BaseSettings with env var support:

```python
class Settings(BaseSettings):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "postgresql://gisuser:changeme@localhost:5432/gis"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    osrm_url: str = "http://localhost:5000"
    linz_api_key: str | None = None
    redis_url: str = "redis://localhost:6379"
    scoring_alpha: float = 0.6
    scoring_beta: float = 0.4
    scoring_density_factor: float = 10.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

Access via: `settings = get_settings()` (cached singleton).

**Key variables:**
- `LINZ_API_KEY` — Server-side only, required for `/parcels` parcel lookups (LINZ Data Service Query API)
- `LINZ_MAX_CONCURRENCY` — Default: 4, controls parallel parcel lookup requests
- `LINZ_BREAKER_*` — Circuit breaker settings for LINZ failures (see CircuitBreaker pattern below)

### 2. Main App (`app/main.py`)

- **Lifespan:** Wires all services on startup, tears down on shutdown
- **CORS:** Allows `localhost:3000` and `127.0.0.1:3000` for local dev
- **Services:** Stored in `app.state` for access in route handlers
- **Routers:** Includes all 4 endpoint routers

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    await redis_module.init_redis(settings.redis_url)
    db_pool = await create_pool(settings.database_url)
    http_client = httpx.AsyncClient()
    app.state.geocoding_svc = GeocodingService(AddressRepository(db_pool), cache)
    app.state.facilities_svc = FacilitiesService(...)
    app.state.distance_svc = DistanceService(...)
    app.state.scoring_svc = LocationScoringService(...)

    yield

    # Cleanup
    await close_pool(db_pool)
    await http_client.aclose()
    await redis_module.close_redis_client()
```

### 3. Address Repository (`app/repositories/db/address_repository.py`)

Queries the LINZ NZ Street Address table in PostGIS via asyncpg. Uses a GIN
trigram index on `full_address_ascii` so ILIKE searches are fast and macron
variants match (e.g. `Otahuhu` finds `Ōtāhuhu`).

```python
results = await repo.search("Cuba Street Wellington", limit=5)
# → [{"displayName": "1 Cuba Street, Wellington", "lat": -41.294, "lon": 174.776}, ...]
```

The pool is created once in `lifespan()` and injected into `GeocodingService`
via `AddressRepository(pool)`.

### 4. Clients

#### OverpassClient (`app/clients/overpass.py`)

- Posts OverpassQL queries to Overpass API
- Supports parallel queries per category
- **Retry logic:** 2× attempts with 1s/2s exponential backoff
- **Deduplication:** By OSM id (handles duplicate nodes/ways)
- **Handles:** Both `node` and `way` elements (ways use `.center`)

```python
facilities = await client.query_facilities(lat, lon, radius_km=10, categories=["schools"])
# → [Facility(id="osm_node_123", name="...", category="schools", lat=-36.852, lon=174.770), ...]
```

**OverpassQL example:**

```
[out:json][timeout:25];
(
  node["amenity"="school"](around:10000,-36.848,174.763);
  way["amenity"="school"](around:10000,-36.848,174.763);
);
out center;
```

#### OSRMClient (`app/clients/osrm.py`)

- Calls OSRM for road distance (driving/walking)
- **Fallback:** Automatically falls back to Haversine if OSRM unavailable
- **Returns:** Distance in km + boolean `used_haversine`

```python
distance_km, used_haversine = await client.distance(
    origin=(lat1, lon1),
    destination=(lat2, lon2),
    mode="driving"
)
```

**OSRM endpoint:** `GET /route/v1/{mode}/{lon},{lat};{dest_lon},{dest_lat}?overview=false`

#### LinzClient (`app/clients/linz.py`)

- Queries the LINZ Data Service Query API for cadastral parcel lookups
- **Layer:** NZ Primary Parcels (layer 50772)
- **Search:** Finds the nearest parcel to a given lat/lon point
- **Default behavior:** Searches within 100m radius, returns top 3 results, takes nearest
- **Returns:** GeoJSON Feature dict with parcel geometry and properties

```python
parcel = await client.find_nearest_parcel(lat=-36.848, lon=174.763)
# → {
#     "type": "Feature",
#     "geometry": {...},
#     "properties": {"id": "...", "parcel_intent": "...", ...}
#   }
```

**LINZ endpoint:** `https://data.linz.govt.nz/services/query/v1/vector.json?key=...&layer=50772&x=...&y=...&radius=100&max_results=3`

#### RedisClient (`app/clients/redis_client.py`)

- **Singleton pattern:** Module-level client
- **Graceful degradation:** If Redis unavailable, `client = None` and cache operations silently skip
- **Used by:** CacheRepository

```python
await init_redis("redis://localhost:6379")
client = await get_client()  # None if failed
```

### 4. Cache Repository (`app/repositories/cache.py`)

Redis-backed caching with graceful skip:

```python
class CacheRepository:
    async def get(self, key: str) -> T | None:
        # Returns None if Redis unavailable or miss

    async def set(self, key: str, value: T, ttl_seconds: int) -> None:
        # Silently skips if Redis unavailable
```

**Cache keys & TTLs:**
| Data | Pattern | TTL |
|---|---|---|
| Geocoding | `geocode:{query_hash}` | 30 days |
| Overpass | `overpass:{lat}:{lon}:{radius}:{category}` | 24h |
| OSRM | `osrm:{lat1},{lon1}:{lat2},{lon2}:{mode}` | 24h |

### 5. Services

#### GeocodingService (`app/services/geocoding.py`)

- Delegates to `AddressRepository` for PostGIS lookup
- Caches results in Redis (30 days)
- Returns top 5 suggestions

#### FacilitiesService (`app/services/facilities.py`)

- **Parallel queries:** Uses `asyncio.gather()` for all categories
- **Retry:** Overpass failures retry 2× with backoff
- **Deduplication:** By OSM id (removes duplicate nodes/ways)
- **Merges:** All results into single facility list
- **Caches:** Per category + radius + location (24h)

#### DistanceService (`app/services/distance.py`)

- Fetches road distances from OSRM
- **Batch requests:** Can request distances for multiple origin/destination pairs
- **Fallback:** Automatically uses Haversine if OSRM unavailable
- **Caches:** Per origin/dest/mode (24h)
- **Returns:** Distances in km + warning flags

#### LocationScoringService (`app/services/scoring.py`)

> For a plain-language walkthrough of how scoring actually works today
> (facility → category → composite, not-checked vs. checked-zero, etc.),
> see [`docs/SCORING.md`](docs/SCORING.md). The formula below is retained for
> historical reference and predates the current per-facility config-driven
> engine — treat `docs/SCORING.md` as the source of truth.

**Isolated, stateless, formula-swappable:**

```python
service = LocationScoringService(alpha=0.6, beta=0.4, density_factor=10.0)
score = service.score(facilities, categories=["schools", "bus_stops"], radius_km=10)
# → CategoryScore(education=72, transport=85, overall=77, coverage="2/4", ...)
```

**Formula:**

```
proximity_score = max(0, 100 × (1 - nearest_distance_km / radius_km))
density_score   = min(100, count × density_factor)
category_score  = α × proximity_score + β × density_score

overall = weighted average of active categories (normalized by sum of active weights)
```

**Category → Dimension Mapping:**

```
schools       → education (40%)
bus_stops     → transport (30%)
hospitals     → healthcare (20%)
supermarkets  → shopping (10%)
pharmacies    → healthcare
universities  → education
parks         → shopping
libraries     → education
```

**Scoring rules:**

- Only requested categories contribute
- If multiple categories map to same dimension, takes max
- Overall score normalized to active categories only
- Coverage: "active_count / total_requested_dimensions"

### API Endpoints

For complete, interactive API documentation, visit **http://localhost:8000/docs** (Swagger UI) when the backend is running. All endpoints are documented there with live request/response examples.

**Key endpoints:**
- `GET /health` — Health check
- `GET /search/address?q=...` — Address autocomplete
- `GET /categories` — List facility categories
- `GET /parcels?lat=<lat>&lon=<lon>` — Resolve a point to its cadastral parcel (GeoJSON Feature)
- `POST /location/analyze` — Analyze a location with facility scoring

---

## Database Migrations

Schema changes to `facility_types`/`category_weights` go through
[Alembic](https://alembic.sqlalchemy.org/). Migrations live in
`apps/api/alembic/versions/` and run against a live Postgres container — they
are **not** part of the Docker image build (unlike `addresses`), so this is a
required manual step whenever you set the project up from scratch or wipe the
`postgis-data` volume.

```bash
cd apps/api

# Apply all pending migrations
uv run alembic upgrade head

# Check current revision
uv run alembic current

# Roll back the most recent migration
uv run alembic downgrade -1

# Create a new migration after changing the schema
uv run alembic revision -m "describe the change"
```

The API's `lifespan` loads `facility_types`/`category_weights` at startup and
will fail to start if these tables don't exist yet — always run migrations
before starting the server on a fresh database.

See [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) for the full table schemas.

### Hazard Demo Data

The hazard scoring feature is currently a **Phase-0 scaffold** (see [`docs/HAZARD_SOURCES.md`](docs/HAZARD_SOURCES.md) for the hazard data source verification, and `HAZARD.md` for the full build spec): one fabricated "demo hazard" over a fixed Auckland bbox, proving the pipeline end to end before any real hazard source is ingested.

`alembic upgrade head` creates the `hazard_*` tables and seeds `hazard_types` with the `demo_hazard` config row — the API starts fine at this point, but every `/location/analyze` response has `hazard: null` (no coverage) until the demo cells are populated:

```bash
./scripts/setup-hazard-demo.sh
```

This is idempotent — safe to re-run, it upserts the same 286 deterministic cells rather than duplicating them. Like `facility_types`, these tables live in the `postgis-data` volume, so they survive image rebuilds and only need re-running after `docker compose down -v`.

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

> **Note on CSV column order:** `docker/sql/02_load.sql` uses an explicit column list. If the LINZ export format changes, verify the CSV header order matches. Inspect with:
>
> ```bash
> head -1 /path/to/downloaded.csv
> ```

---

## Error Handling

### Sanitization Layer

All error messages are **scrubbed** before returning to client:

- ❌ No stack traces
- ❌ No service names (Overpass, OSRM, PostGIS)
- ❌ No internal URLs
- ✅ Friendly, user-safe messages only

### Scenarios

| Scenario                 | Status | Body                                      |
| ------------------------ | ------ | ----------------------------------------- |
| Address not found        | 404    | `{"detail": "Address not found"}`         |
| No facilities in radius  | 200    | Empty `features[]` + warning in response  |
| Overpass partial failure | 200    | Partial facilities + `warnings[]`         |
| Overpass total failure   | 503    | Safe message (no technical details)       |
| OSRM unavailable         | 200    | Haversine distances + warning in response |
| LINZ API key not configured | 502 | `{"detail": "Parcel lookup service unavailable"}` |
| No parcel found at point  | 404    | `{"detail": "No parcel found near this location"}` |
| LINZ service unavailable  | 502    | Safe message (API key never logged)       |
| Rate limit (Overpass)    | 429    | `Retry-After: 60` header                  |
| Rate limit (this API)    | 429    | `Retry-After` header — see [docs/PROTECTION.md](docs/PROTECTION.md) |
| Too many concurrent `/location/analyze` requests | 503 | `Retry-After: 2` header |
| Invalid input            | 422    | Pydantic validation errors                |

---

## Testing

### Run All Tests

```bash
uv run pytest                  # Run all
uv run pytest -v              # Verbose
uv run pytest -xvs            # Stop on first failure, show output
```

### Test Files

#### `tests/test_scoring.py` (18 tests)

Unit tests for `LocationScoringService`:

- Formula correctness (proximity + density weights)
- Edge cases (zero facilities, no active categories)
- Dimension mapping (schools → education, bus_stops → transport)
- Weighted average normalization
- Coverage string format

```bash
uv run pytest tests/test_scoring.py -v
```

#### `tests/test_distance.py` (10 tests)

Unit tests for distance calculations:

- Haversine formula correctness (against known distances)
- Edge cases (same lat/lon, antipodal points)
- Unit conversions (meters ↔ km)

```bash
uv run pytest tests/test_distance.py -v
```

#### `tests/test_api.py` (17 tests)

Integration tests via `httpx` TestClient:

- `GET /health` returns correct schema + status 200
- `GET /categories` returns all categories with `implemented` flags
- Fixtures mock `AddressRepository`, Overpass, and OSRM responses

```bash
uv run pytest tests/test_api.py -v
```

#### `tests/test_linz_client.py` (4 tests)

Unit tests for `LinzClient`:

- API key validation (fails when key is not configured)
- Query construction (correct params sent to LINZ Query API)
- Response parsing (extracts nearest feature from API response)
- No results scenario (returns None when no parcels found)

```bash
uv run pytest tests/test_linz_client.py -v
```

#### `tests/test_parcels_api.py` (6 tests)

Integration tests for `/parcels` endpoint:

- Valid lat/lon returns parcel GeoJSON Feature
- Invalid lat/lon rejected with 400 Bad Request
- No parcel found returns 404
- LINZ service unavailable returns 502
- API key not configured returns 502
- Rate limiting enforced

```bash
uv run pytest tests/test_parcels_api.py -v
```

### Coverage

```bash
uv run pytest --cov=app --cov-report=html
# Open htmlcov/index.html
```

---

## Linting & Formatting

### Ruff (Lint + Format)

```bash
uv run ruff check app/              # Check
uv run ruff format app/             # Auto-fix
```

**Rules enabled:**

- `E` — pycodestyle errors
- `F` — Pyflakes
- `I` — isort (import sorting)
- `UP` — pyupgrade (Python 3.13 idioms)

**Config:** `pyproject.toml`

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]
```

---

## Dependencies

### Runtime (`pyproject.toml`)

- **fastapi** (0.115+) — Web framework
- **uvicorn[standard]** (0.32+) — ASGI server
- **httpx** (0.27+) — Async HTTP client
- **pydantic** (2.9+) — Validation
- **pydantic-settings** (2.6+) — Environment variable handling
- **redis** (5.2+) — Async Redis client

### Dev/Test

- **pytest** (8.0+) — Test framework
- **pytest-asyncio** (0.24+) — Async test support
- **ruff** (0.8+) — Linting

---

## Performance Considerations

### Caching Strategy

| Data                               | TTL            | Rationale                                     |
| ---------------------------------- | -------------- | --------------------------------------------- |
| PostGIS address search (geocoding) | 30 days        | LINZ addresses rarely change                  |
| Overpass (facilities)              | 24 hours       | OSM data updates slowly                       |
| OSRM (distances)                   | 24 hours       | Routes stable, but roads may change           |
| **Scores**                         | **NOT cached** | Computed on-the-fly from cached facility data |

### Parallel Execution

- Overpass queries run **in parallel** (one per category) via `asyncio.gather()`
- OSRM distance requests can be batched

### Timeouts

- PostGIS (asyncpg pool): configurable via `create_pool` min/max size
- Overpass: 25s (specified in OverpassQL `[timeout:25]`)
- OSRM: 10s default
- Redis: 5s default

---

## Deployment

### Docker Build

See `apps/api/Dockerfile` (multi-stage, `uv`-based, non-root runtime user).
Build/run it as part of the repo-root `docker-compose.prod.yml` overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Environment Variables

Ensure these are set in production:

```env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://gisuser:secret@your-postgis-host:5432/gis
OVERPASS_URL=https://your-overpass-instance
OSRM_URL=https://your-osrm-instance
LINZ_API_KEY=your-linz-data-service-key
REDIS_URL=redis://your-redis-instance
API_SHARED_SECRET=your-shared-secret-for-api-auth
```

---

## Logging & Observability

### Structured Logging

FastAPI logs are JSON-formatted (via Uvicorn):

```bash
uv run uvicorn app.main:app --log-config logging.yaml
```

### Health Checks

- `GET /health` — Returns 200 if API is running
- Includes external service availability checks (future enhancement)

### Metrics (Future)

- Response times per endpoint
- Cache hit/miss rates
- Overpass retry counts
- OSRM fallback rate

---

## Troubleshooting

### Redis connection fails

```bash
# Check Redis is running
docker compose ps redis

# Test connectivity
redis-cli ping
# Should return: PONG
```

### Address search returns no results

```bash
# Check PostGIS is ready
pg_isready -h localhost -p 5432 -U gisuser -d gis

# Verify data loaded
psql -h localhost -U gisuser -d gis -c "SELECT count(*) FROM addresses;"

# Test a search directly
psql -h localhost -U gisuser -d gis \
  -c "SELECT full_address FROM addresses WHERE full_address_ascii ILIKE 'cuba%' LIMIT 5;"
```

### Overpass queries timeout or fail

```bash
# Check if Overpass API is responding
curl -X POST https://overpass-api.de/api/interpreter \
  -d '[out:json];node["amenity"="school"](around:10000,-36.848,174.763);out;'

# If it fails, the public Overpass may be rate-limited
# Consider self-hosting or using a dedicated instance
```

### OSRM distances unavailable

```bash
# Check OSRM is running
curl http://localhost:5000/health

# Test a route
curl "http://localhost:5000/route/v1/driving/174.763,-36.848;174.770,-36.852?overview=false"

# If OSRM is down, API falls back to Haversine automatically
```

### Parcel lookup returns 502

```bash
# Check LINZ_API_KEY is configured
echo $LINZ_API_KEY  # Should print your development key (or production key in CI/prod)

# If unset, set it in .env.local
echo "LINZ_API_KEY=your-key" > apps/api/.env.local

# Test the LINZ Query API directly
curl "https://data.linz.govt.nz/services/query/v1/vector.json?key=YOUR_KEY&layer=50772&x=174.763&y=-36.848&radius=100&max_results=1"

# If the API call times out or returns an error, the LINZ service may be unavailable
# The circuit breaker will open after 5 consecutive failures, failing fast with 502
```

---

## Future Enhancements

- [ ] **Request IDs:** Generate in BFF, pass to FastAPI for tracing
- [x] **Rate limiting:** Per IP, via the BFF-forwarded visitor IP — see [How the API is protected](docs/PROTECTION.md)
- [ ] **Authentication:** JWT tokens, OAuth2
- [ ] **OpenAPI spec generation:** For frontend type generation (`openapi-typescript`)
- [ ] **Async batch processing:** For large facility lists
- [ ] **Custom scoring formulas:** Allow clients to provide weights
- [ ] **WebSocket support:** Real-time facility updates
- [ ] **Prometheus metrics:** `/metrics` endpoint

---

## Development Tips

### Debug Mode

```bash
uv run uvicorn app.main:app --reload --log-level debug
```

### Interactive API Testing

```bash
# Terminal 1: Run server
uv run uvicorn app.main:app --reload

# Terminal 2: Call endpoints
curl http://localhost:8000/health
curl "http://localhost:8000/search/address?q=Queen&country=nz"
curl -X POST http://localhost:8000/location/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Queen Street, Auckland",
    "lat": -36.848,
    "lon": 174.763,
    "radiusKm": 10,
    "categories": ["schools", "bus_stops"],
    "distanceMode": "driving"
  }'
```

### Swagger UI

Open http://localhost:8000/docs and test endpoints interactively.

---

## Contributing

1. **Keep services pure:** No HTTP calls in scoring or domain logic
2. **Isolate clients:** Each external service gets its own client
3. **Handle errors safely:** Scrub messages before client exposure
4. **Cache strategically:** Consider TTL and staleness trade-offs
5. **Test thoroughly:** Unit tests for services, integration tests for endpoints
6. **Lint before push:** `ruff check` must pass

---

## References

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Pydantic Docs](https://docs.pydantic.dev)
- [LINZ NZ Street Address (layer 123113)](https://data.linz.govt.nz/layer/123113-nz-street-addresses/)
- [Overpass API](https://overpass-api.de)
- [OSRM Docs](http://project-osrm.org)
- [Redis Py](https://github.com/redis/redis-py)
