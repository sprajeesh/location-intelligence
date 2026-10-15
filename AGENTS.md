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
docker compose up -d                                  # Redis, PostGIS, OSRM (car, foot and bike profiles)
cd apps/api && uv run uvicorn app.main:app --reload   # FastAPI on :8000
cd apps/web && pnpm dev                               # Next.js on :3000
```

## Commands (as CI runs them)

`.github/workflows/push.yml` is the source of truth. Install and run from the app directory, not the repo root.

```bash
cd apps/web && pnpm install           # web deps (pnpm)
cd apps/api && uv sync                # API deps (Python 3.13)

cd apps/web && pnpm run lint          # eslint .
cd apps/api && uv run ruff check . && uv run ruff format --check .

cd apps/web && pnpm test              # Jest
cd apps/api && uv run pytest

pnpm run build:web                    # repo root; the CI build job
cd apps/web && pnpm run build:cf      # OpenNext build for Cloudflare; the web deploy job

cd apps/api && uv run alembic upgrade head   # migrations; needed on a fresh DB before the API runs
```

The unit-test job in CI starts no Docker services, so Jest and pytest should run without Docker.

E2E (Playwright) needs the full stack: `cd apps/web && pnpm exec playwright install --with-deps chromium`, then `docker compose up -d --wait postgis redis osrm osrm-foot osrm-bike`, migrations, and FastAPI on :8000. Then run `pnpm test:e2e:smoke` (tag `@smoke`, runs on every branch in CI) or `pnpm test:e2e` (full suite, CI runs it on `main` only). CI routes against a small fixture OSRM extract; for real road data, run `scripts/setup-osrm.sh` by hand. If Docker isn't available, the E2E suite can't run here. Say so rather than skipping it.

---

## Backend (`apps/api/`)

FastAPI + Python 3.13 + uv. Tests: `uv run pytest`; lint: `uv run ruff check`.

Every response carries `X-Request-ID` (per call) and `X-Correlation-ID` (per user action) headers. Logs are one JSON object per line tagged with both. See `apps/api/docs/LOGGING.md`.

Endpoints, the `POST /location/analyze` contract and the `/categories` response: [`apps/api/docs/API_CONTRACT.md`](apps/api/docs/API_CONTRACT.md). Module map: `apps/api/README.md` (Key Components).

---

## Frontend (`apps/web/`)

Exact dependency versions: `apps/web/package.json`.

UI rules (layout, theme, map, search flow, results, i18n, accessibility): [`apps/web/docs/FRONTEND.md`](apps/web/docs/FRONTEND.md). Stack, structure and setup: `apps/web/README.md`.

---

## Environment Variables

```env
# Backend (apps/api/.env or root .env)
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
LOG_FORMAT=json
DATABASE_URL=postgresql://gisuser:changeme@localhost:5432/gis
# SQLAlchemy pool per worker process; budget = workers x (size + overflow). See apps/api/docs/DATABASE_CONNECTIONS.md
DB_POOL_SIZE=5
DB_POOL_MAX_OVERFLOW=5
# Server-side statement_timeout per DB query, in ms. Timed-out address searches return 504.
DB_STATEMENT_TIMEOUT_MS=5000
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
# Map corrections (POST /map-corrections). Secret is required when ENVIRONMENT=production
MAP_CORRECTION_IP_HASH_SECRET=
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10

# Frontend (apps/web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Conventions and gotchas

- **Versions are set by release-please, not by hand.** The API version comes from `apps/api/pyproject.toml` (read by `app/config/version.py`). The web version is in `apps/web/package.json`. Release PRs bump both (`.release-please-manifest.json`), so leave them alone in feature PRs.
- **Formatting is partly enforced.** CI checks `ruff format --check` for the API, but only `eslint .` for the web. Run `uv run ruff format` before pushing API changes.
- **Two web builds exist.** CI's build job runs `build:web`. The Cloudflare deploy runs `build:cf` (OpenNext). A passing `next build` doesn't prove the Cloudflare build works.

---

## Git / Remote

- Remote: `git@github.com:sprajeesh/location-intelligence.git`
- Default branch: `main`; use feature branches and PRs
