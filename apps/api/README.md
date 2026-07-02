# Location Intelligence — FastAPI Backend

Production-ready FastAPI service for location-based facility analysis and scoring.
Handles geocoding (LINZ PostGIS), Overpass queries, distance calculation, caching, and hybrid scoring.

**Framework:** FastAPI 0.115+  
**Language:** Python 3.13  
**Package Manager:** uv  
**Testing:** pytest (45 tests)  
**Linting:** Ruff

---

## Quick Start

### Setup

```bash
# Install dependencies
uv sync

# Create .env (copy from root)
cp ../.env .env

# Run server
uv run uvicorn app.main:app --reload
```

Server runs on http://localhost:8000

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
│ ┌──────────────────────────────────────────┐ │
│ │ Cache Repository (Redis)                 │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│      External Services                  │
│ PostGIS  Overpass API  OSRM  Redis      │
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
└── test_distance.py        # Unit tests (Haversine)
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
    redis_url: str = "redis://localhost:6379"
    scoring_alpha: float = 0.6
    scoring_beta: float = 0.4
    scoring_density_factor: float = 10.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

Access via: `settings = get_settings()` (cached singleton).

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

### 6. API Endpoints

#### GET /health

```python
@router.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

#### GET /search/address

```python
@router.get("/search/address")
async def search_address(q: str, country: str = "nz"):
    # → [AddressResult, ...]
```

#### GET /categories

```python
@router.get("/categories")
async def get_categories():
    # → [CategoryInfo(id, label, implemented, color), ...]
```

#### POST /location/analyze

```python
@router.post("/location/analyze")
async def analyze_location(req: AnalyzeRequest):
    # 1. Geocode address if provided
    # 2. Parallel Overpass queries per category
    # 3. OSRM distance for each facility
    # 4. LocationScoringService.score()
    # 5. Return AnalyzeResponse
```

**Request schema:**

```python
class AnalyzeRequest(BaseModel):
    address: str | None = None
    lat: float | None = None
    lon: float | None = None
    radius_km: float = Field(default=10.0, ge=0.1, le=100.0)
    categories: list[str] = ["schools", "bus_stops"]
    distance_mode: Literal["driving", "walking"] = "driving"
```

**Response schema:**

```python
class AnalyzeResponse(BaseModel):
    location: LocationResult
    features: list[FeatureResult]
    score: ScoreResult
    warnings: list[str]
```

---

## Data Models

### Domain Models (`app/models/domain.py`)

```python
@dataclass
class Facility:
    id: str
    name: str
    category: str
    lat: float
    lon: float
    distance_km: float

@dataclass
class Location:
    lat: float
    lon: float
    display_name: str

@dataclass
class CategoryScore:
    education: float | None
    healthcare: float | None
    transport: float | None
    shopping: float | None
    overall: float | None
    coverage: str
```

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
| Rate limit (Overpass)    | 429    | `Retry-After: 60` header                  |
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

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install uv && uv sync
COPY app app/
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

Ensure these are set in production:

```env
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://gisuser:secret@your-postgis-host:5432/gis
OVERPASS_URL=https://your-overpass-instance
OSRM_URL=https://your-osrm-instance
REDIS_URL=redis://your-redis-instance
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

---

## Future Enhancements

- [ ] **Request IDs:** Generate in BFF, pass to FastAPI for tracing
- [ ] **Rate limiting:** Per IP or API key
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
