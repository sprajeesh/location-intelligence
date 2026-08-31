# Database Tables

The API uses a single Postgres/PostGIS database (`gis`). Its three tables are
managed by two completely different mechanisms — knowing which is which
matters when you change either one:

| Table              | Managed by                                        | Rows      |
| ------------------ | -------------------------------------------------- | --------- |
| `addresses`         | Baked into the `postgis` Docker image at **build time** (`docker/sql/01_schema.sql`, `02_load.sql`, `03_post_load.sql`) | ~2.6M |
| `facility_types`     | **Alembic migration**, run manually against a running container (`apps/api/alembic/`) | 12 |
| `category_weights`   | **Alembic migration**, same as above                | 5 |

`addresses` rebuilds fresh every time you rebuild the `postgis` image (see the
root `README.md`'s "PostGIS Address Data" section). `facility_types` and
`category_weights` do **not** — they're created once via `alembic upgrade
head` and persist in the `postgis-data` Docker volume across image rebuilds.
See "Migrations" below for the commands.

---

## `addresses`

LINZ NZ Street Address dataset (layer 123113), used for address
autocomplete/geocoding (`GET /search/address`, `GeocodingService`).

| Column                         | Type              | Notes |
| ------------------------------- | ----------------- | ----- |
| `id`                            | `SERIAL PRIMARY KEY` | |
| `wkt`                           | `TEXT`             | |
| `address_id`                    | `BIGINT NOT NULL`  | LINZ source id |
| `road_id`                       | `BIGINT`           | |
| `full_address_number`           | `VARCHAR(100)`     | |
| `full_road_name`                | `VARCHAR(255)`     | |
| `full_address`                  | `VARCHAR(400) NOT NULL` | Display value returned to clients as `displayName` |
| `territorial_authority`         | `VARCHAR(100)`     | |
| `unit`                          | `VARCHAR(50)`      | |
| `address_number`                | `INT`              | |
| `address_number_suffix`         | `VARCHAR(10)`      | |
| `address_number_high`           | `INT`              | |
| `road_name`                     | `VARCHAR(255)`     | |
| `road_name_type`                | `VARCHAR(100)`     | |
| `road_name_suffix`              | `VARCHAR(50)`      | |
| `suburb_locality`               | `VARCHAR(100)`     | |
| `town_city`                     | `VARCHAR(100)`     | |
| `is_land`                       | `VARCHAR(5)`       | |
| `address_lifecycle`             | `VARCHAR(50)`      | |
| `full_road_name_ascii`          | `VARCHAR(255)`     | |
| `full_address_ascii`            | `VARCHAR(400)`     | Macron-stripped ASCII form — this is what `ILIKE` search actually matches against |
| `territorial_authority_ascii`   | `VARCHAR(100)`     | |
| `road_name_ascii`               | `VARCHAR(255)`     | |
| `suburb_locality_ascii`         | `VARCHAR(100)`     | |
| `town_city_ascii`               | `VARCHAR(100)`     | |
| `shape_x`                       | `DECIMAL(20, 8)`   | Longitude |
| `shape_y`                       | `DECIMAL(20, 8)`   | Latitude |
| `shape`                         | `GEOMETRY(Point, 4326)` | Populated from `shape_x`/`shape_y` after CSV load |

**Indexes:** `full_address`, `road_name`, `town_city` (plain B-tree), plus a
`pg_trgm` GIN index on `full_address_ascii` (`idx_addresses_full_address_ascii_trgm`)
that accelerates the `ILIKE '%query%'` autocomplete search.

---

## `facility_types`

One row per facility type (schools, bus stops, hospitals, ...). This is the
single source of truth for everything the scoring engine, `/categories`, and
the Overpass client need to know about a facility type — loaded once into
memory at API startup (`app/config/scoring_config_loader.py`) and cached for
the process lifetime (restart the API to pick up an edit).

| Column                     | Type            | Nullable | Notes |
| --------------------------- | --------------- | -------- | ----- |
| `id`                        | `BIGSERIAL PRIMARY KEY` | no | Surrogate key only — never used outside this table |
| `slug`                      | `TEXT UNIQUE`    | no | The real identifier, e.g. `"schools"` — this is what request bodies, cache keys, and the frontend all key off |
| `label`                     | `TEXT`           | no | Plural display label, e.g. `"Schools"` (`GET /categories`, map legend) |
| `singular_label`            | `TEXT`           | no | e.g. `"school"` — used in scoring explanation text |
| `color`                     | `TEXT`           | no | Marker color hex, e.g. `"#F59E0B"` |
| `implemented`               | `BOOLEAN`        | no | Whether this shows up in `GET /categories` |
| `is_default`                | `BOOLEAN`        | no | Included in the default facility set used by `POST /location/analyze` when `categories` is omitted (added in migration `0002`) |
| `composite_category`        | `TEXT` (FK → `category_weights.category`) | no | Which of the 6 composite categories this rolls into, e.g. `"education"` |
| `category_weight`           | `DOUBLE PRECISION` | no | This facility's weight within `composite_category`, e.g. `0.55` |
| `distance_mode`             | `TEXT`           | no | `"walk"`, `"drive"`, or `"best_of_both"` |
| `decay_constant`            | `DOUBLE PRECISION` | no | km scale of the exponential proximity decay |
| `reference_radius`          | `DOUBLE PRECISION` | no | Soft "typical range", used only for explanation-text bucketing |
| `hard_cutoff`               | `DOUBLE PRECISION` | no | Real bound: Overpass fetch radius and density-sum cutoff. Must be `> reference_radius` |
| `saturation_point`          | `DOUBLE PRECISION` | no | Raw density count that maps to ~95/100 |
| `proximity_weight`          | `DOUBLE PRECISION` | no | Must sum to 1.0 with `density_weight` |
| `density_weight`            | `DOUBLE PRECISION` | no | |
| `count_ceiling`             | `DOUBLE PRECISION` | yes | Optional cap on how many POIs contribute to density |
| `drive_decay_constant`      | `DOUBLE PRECISION` | yes | Only set when `distance_mode = "best_of_both"` (currently only `railway_stations`) |
| `drive_reference_radius`    | `DOUBLE PRECISION` | yes | Same |
| `drive_hard_cutoff`         | `DOUBLE PRECISION` | yes | Same. Must be `> drive_reference_radius` |
| `osm_tags`                  | `JSONB`          | no | Overpass `(key, value)` tag pairs, e.g. `[["amenity","school"]]` |

**Constraints:**
- `ck_hard_cutoff_exceeds_reference_radius` — `hard_cutoff > reference_radius`
- `ck_drive_fields_all_or_nothing` — the three `drive_*` columns are either all `NULL` or all set
- `ck_drive_hard_cutoff_exceeds_drive_reference_radius` — `drive_hard_cutoff > drive_reference_radius` when both are set

Not enforced as DB constraints (validated in Python instead, via the
`FacilityConfig` Pydantic model in `app/config/scoring_config.py`, when config
is loaded at startup): `proximity_weight + density_weight == 1.0` (float
precision) and the cross-row `category_weights` sum-to-1.0 check below.

**Example row (`schools`):**

```
slug: schools | label: Schools | singular_label: school | color: #F59E0B
implemented: true | composite_category: education | category_weight: 0.55
is_default: true
distance_mode: walk | decay_constant: 0.4 | reference_radius: 1.0 | hard_cutoff: 3.0
saturation_point: 3 | proximity_weight: 0.5 | density_weight: 0.5
osm_tags: [["amenity", "school"]]
```

**Default facility set:** `POST /location/analyze` uses whichever facility
types have `is_default = true` when the request omits `categories` entirely
(an explicit `"categories": []` still means "score nothing", not "use
defaults"). Currently: `schools`, `gps`, `bus_stops`, `railway_stations`,
`supermarkets` — one from education, one from healthcare, two from
transport, and the only shopping facility type. `recreation` and
`food_and_drink` are deliberately excluded from the default set. See
migration `0002` below.

---

## `category_weights`

The top-level composite blend across the 6 categories (education, transport,
healthcare, shopping, recreation, food_and_drink) that facility types roll up into.

| Column     | Type                | Nullable | Notes |
| ---------- | ------------------- | -------- | ----- |
| `id`       | `BIGSERIAL PRIMARY KEY` | no   | Surrogate key only |
| `category` | `TEXT UNIQUE`        | no       | Business key, e.g. `"education"` — referenced by `facility_types.composite_category` |
| `weight`   | `DOUBLE PRECISION`   | no       | Composite weight, e.g. `0.40` |

All 6 rows' `weight` values must sum to `1.0` — validated in Python at
startup (`scoring_config_loader.load_scoring_config`), not as a DB
constraint (a cross-row invariant doesn't translate to a single-row `CHECK`).

**Current seed values:** education `0.4124`, transport `0.3093`, healthcare
`0.2062`, shopping `0.0721`, recreation `0.0000`, food_and_drink `0.0000`.

---

## Relationships

```
category_weights (6 rows)
   ▲  category (unique)
   │
   │  FK: composite_category
   │
facility_types (14 rows)
```

Every facility type belongs to exactly one composite category today — this
is a real 1:1 relationship in the current data (confirmed: no facility type
appears under two categories), not a simplified model, so no separate join
table is needed.

---

## Migrations

Schema changes to `facility_types`/`category_weights` go through Alembic
(`apps/api/alembic/`). `addresses` is **not** managed by Alembic — see the
root `README.md`.

```bash
cd apps/api

# Apply all pending migrations (creates + seeds facility_types/category_weights)
uv run alembic upgrade head

# Roll back the most recent migration
uv run alembic downgrade -1

# Create a new migration after changing app/config/scoring_config.py's shape
uv run alembic revision -m "describe the change"
```

Migration `0002` (`add_is_default_to_facility_types`) is a worked example of
an `add_column` + data-backfill migration on top of `0001`'s
`create_table` + seed: it adds `is_default` with `server_default=false`, then
`UPDATE`s the 5 default-set slugs to `true`.

Alembic connects synchronously via `psycopg` (see `alembic/env.py`) — this is
separate from the app's own `asyncpg` connection pool used at runtime; only
the migration tooling uses `psycopg`.

The Postgres user the app connects as (`gisuser` by default) needs `CREATE`
on the `public` schema for `alembic upgrade head` to succeed — this is
granted in `docker/Dockerfile.postgis`. If you hit `permission denied for
schema public` running a migration against an older container, apply it
manually once: `GRANT CREATE ON SCHEMA public TO gisuser;`.
