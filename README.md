# Location Intelligence

A production-ready MVP for analyzing property locations in New Zealand. Enter any NZ address and visualize nearby facilities (schools, bus stops) within a configurable radius, along with a hybrid location score powered by OpenStreetMap data.

**Target users:** Property buyers, real estate agents, renters in New Zealand.

**Roadmap & future enhancements:** [ROADMAP.md](ROADMAP.md)

---

## How to Setup

### Prerequisites

- Docker & Docker Compose
- pnpm 9.15+
- Python 3.13 + uv
- Node.js 22+ (required for Next.js 16)
- A pre-downloaded LINZ NZ addresses ZIP at `docker/data/lds-nz-addresses-CSV.zip` (download from [LINZ Data Service](https://data.linz.govt.nz/layer/123113-nz-street-addresses/))

### Shared Infrastructure

```bash
# Clone repo
git clone git@github.com:sprajeesh/location-intelligence.git
cd location-intelligence

# Copy env template and fill in secrets
cp .env.example .env
# Edit .env: set DB_USER, DB_PASSWORD, DATABASE_URL

# IMPORTANT: Prepare OSRM data (required, ~5 min, downloads 500MB NZ road data)
./scripts/setup-osrm.sh

# Build and start Docker services (Redis, PostGIS + LINZ data, OSRM)
# NOTE: PostGIS build loads ~2.6M NZ addresses and builds indexes.
# First build takes 10–20 minutes.
docker compose build postgis
docker compose up -d

# Verify services are healthy
docker compose ps  # All should show "healthy"
```

**Service endpoints after startup:**
- Redis: `localhost:6379`
- PostGIS: `localhost:5432` (database: `gis`)
- OSRM: `http://localhost:5000`

### Backend (FastAPI)

See [apps/api/README.md](apps/api/README.md#quick-start)

### Frontend (Next.js)

See [apps/web/README.md](apps/web/README.md#quick-start)

---

### Infrastructure Troubleshooting

**Run diagnostics** (checks all services):

```bash
./scripts/diagnose.sh
```

**Common infrastructure issues:**

| Issue                                | Solution                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `docker compose build postgis` fails | Ensure `docker/data/lds-nz-addresses-CSV.zip` exists (download from [LINZ Data Service](https://data.linz.govt.nz/layer/123113-nz-street-addresses/)) |
| PostGIS build takes long             | Expected — downloads 2.6M addresses and builds indexes (~10–20 min)               |
| `docker compose up` fails on `osrm`  | Run `./scripts/setup-osrm.sh` first (downloads NZ road data)                     |
| OSRM takes too long to start         | Normal; OSRM loads large dataset into memory on startup (~1-2 min)                |

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

| Layer        | Tech                                            | Purpose                                                  |
| ------------ | ----------------------------------------------- | -------------------------------------------------------- |
| **Frontend** | Next.js 16 (Active LTS) + React 19 + TypeScript | UI, address search, map interaction, i18n                |
| **BFF**      | Next.js API routes                              | Thin proxy to FastAPI, no auth/caching for MVP           |
| **Backend**  | FastAPI + Python 3.13                           | Orchestration, external service calls, scoring           |
| **Map**      | React Leaflet + OpenStreetMap                   | Visualization                                            |
| **State**    | Zustand + React Query                           | Client-side UI state + server state                      |
| **Services** | Docker Compose                                  | Redis (cache), PostGIS/LINZ (geocoding), OSRM (distance) |

---

## Project Structure

```
location-intelligence/
├── apps/
│   ├── api/                  # FastAPI backend — see README.md
│   └── web/                  # Next.js 16.2.9 frontend — see README.md
├── docker/
│   ├── Dockerfile.postgis    # PostGIS + LINZ NZ address data
│   └── sql/                  # Database schemas and load scripts
├── docker-compose.yml        # Redis + PostGIS + OSRM services
├── scripts/                  # Utility scripts (setup-osrm.sh, diagnose.sh)
├── CONTRIBUTING.md           # Branching, commits, release process
├── ROADMAP.md                # Post-MVP feature roadmap
├── SPEC.md                   # Original product specification
└── .env.example              # Environment variables template
```

**For detailed structure and setup of each component:**
- [Backend API](apps/api/README.md)
- [Frontend Web](apps/web/README.md)

---

## Features

### 🔍 Address Search
Autocomplete search against official LINZ NZ Street Address dataset (~2.6M addresses) with trigram-indexed PostgreSQL queries that handle macrons and partial matches.

### 📍 Facility Discovery
Discover nearby schools and bus stops (with roadmap for hospitals, universities, supermarkets, parks, libraries, pharmacies).

### 📏 Distance Calculation
Road distance via OSRM with Haversine fallback, configurable radius (1km to 20km or custom).

### 🎯 Location Score
Hybrid scoring combining proximity and facility density, with weighted categories (Education: 40%, Transport: 30%).

### 🗺️ Interactive Map
Leaflet-based visualization with category-colored markers, marker clustering, and facility details on click.

### 🌍 i18n
English fully translated; Māori placeholder structure for future localization.

### 🎨 Dark Theme
Glassmorphism design with responsive layout (desktop panel vs. mobile bottom sheet).


---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching conventions, commit guidelines, and the release process.

---

## Troubleshooting

### Services won't start or are unhealthy

```bash
# Check individual service status
docker compose ps

# Check PostGIS and address data
pg_isready -h localhost -p 5432 -U $DB_USER -d gis
psql -h localhost -U $DB_USER -d gis -c "SELECT count(*) FROM addresses;"

# Check OSRM
curl http://localhost:5000/health

# Check Redis
redis-cli ping

# View service logs
docker compose logs postgis
docker compose logs osrm
docker compose logs redis
```

**For app-specific issues (backend, frontend, map rendering, autocomplete):** See [apps/api/README.md#troubleshooting](apps/api/README.md#troubleshooting) or [apps/web/README.md#troubleshooting](apps/web/README.md#troubleshooting)

---

## License

MIT

---

## Contact

- **Project:** Location Intelligence MVP
- **Team:** LINZ / Prajeesh Koothupalakkal
- **Email:** sprajeesh@gmail.com
