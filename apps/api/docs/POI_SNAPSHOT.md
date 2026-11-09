# OSM POI snapshot

Facility search (schools, bus stops, parks, hospitals and the other categories in
`app/config/scoring_config.py`) used to query the public Overpass API on every
cache miss. Overpass is shared and intermittent: during this work, spot checks hit
502 and 504 responses, and a failed batch dropped those categories from the
result. The POI snapshot keeps a local copy of the facility OSM data in PostGIS,
so the request path reads it instead.

Overpass is still used for two things: categories the snapshot does not cover
(none today), and the map-correction endpoints, which check live OSM state. If
the snapshot is missing, every category falls back to Overpass, which is the old
behaviour.

## How it fits together

```
Geofabrik NZ PBF (monthly)
  -> GitHub Actions: python -m app.poi_snapshot build     (.github/workflows/poi-snapshot.yml)
  -> GitHub Release asset: poi-snapshot-YYYY-MM-DD        (ndjson.gz + manifest.json)
  -> on the server: python -m app.poi_snapshot load       (one transaction, atomic swap)
  -> PostGIS: osm_poi (rows) + osm_poi_snapshot (manifest)
  -> API startup reads the manifest once (like the scoring config)
  -> FacilitiesService: covered categories -> PostGIS radius query
                        other categories   -> Redis cache -> Overpass (unchanged)
```

| Component | File |
|---|---|
| Migration (tables) | `alembic/versions/0009_create_osm_poi_snapshot.py` |
| Tag list (derived from `FACILITY_CONFIGS`) and extraction | `app/poi_snapshot/extract.py` |
| Atomic load into PostGIS | `app/poi_snapshot/load.py` |
| CLI (`build`, `load`) | `app/poi_snapshot/__main__.py` |
| Read side (radius query, manifest) | `app/repositories/db/poi_snapshot_repository.py` |
| Routing between snapshot and Overpass | `app/services/facilities.py` |
| Startup wiring and kill switch | `app/main.py`, `POI_SNAPSHOT_ENABLED` |
| Scheduled build and release | `.github/workflows/poi-snapshot.yml` |

The runtime image installs without dev dependencies. `pyosmium` is a dev
dependency, used only by `build`. The `load` command and the API do not import
it. A test enforces this (`test_load_path_does_not_need_pyosmium`).

## Data

- **Which elements:** every node, way or multipolygon relation with at least one
  (key, value) pair from `FACILITY_CONFIGS` (20 pairs across 14 categories). The
  pairs are derived from code, so the extract cannot drift from the categories
  the code defines.
- **What is stored per element:** `osm_type`, `osm_id`, `extent` (every outline
  point as a MULTIPOINT geography; a node is one point), and `tags`, a subset of
  the element's tags: the matched keys, the name keys and the detail keys the API
  shows. A stored row parses through the same code as an Overpass element.
- **Matching:** an element is in range when any outline point is within the radius.
  That is how Overpass `around:` treats ways. Matching on a centre point misses
  large footprints (see Accuracy).
- **Site relations** (`type=site`, for example a school campus) have no outline of
  their own. Their member ways and nodes supply the points, as they do in Overpass.
- **Reported position:** the bounding-box centre of `extent`, which is what
  Overpass `out center` returns.
- **Size:** New Zealand extract, 2026-11-09 build. 49,327 rows. The gzipped
  NDJSON is about 4 MB.
- **Build cost:** about 3 minutes and 2.2 GB peak RSS on this machine. The site
  relation pass re-reads the file, which accounts for most of the time. That fits
  comfortably in the memory of a standard GitHub-hosted runner, and the workflow
  allows 120 minutes.
- **Tables:** `osm_poi` (one row per element, unique on `(osm_type, osm_id)`, GiST
  index on `extent`, GIN index on `tags`) and `osm_poi_snapshot` (single-row
  manifest: built time, source name, source timestamp, row count, covered pairs).
  Coverage is decided per category: a category is served from the snapshot only if
  every one of its pairs is in the manifest. An empty manifest means no snapshot.

## Operations

### Build (automated)

`poi-snapshot.yml` runs on the 1st of each month at 03:00 UTC, and on demand from
the Actions tab (`workflow_dispatch`). It downloads the Geofabrik NZ extract, runs
`python -m app.poi_snapshot build`, and publishes a release named
`poi-snapshot-YYYY-MM-DD` with two assets: `poi-snapshot.ndjson.gz` and
`poi-snapshot.manifest.json`. The build does not touch production.

### Load (manual, on the server)

After a release is published, download its two assets and load them. Run this as
the same database role that runs migrations, because the loader renames tables.

```bash
gh release download poi-snapshot-YYYY-MM-DD -D /path/to/snapshot
python -m app.poi_snapshot load --dir /path/to/snapshot   # needs DATABASE_URL
```

The loader runs in one transaction. It builds `osm_poi_next` from a temp table
while the live table keeps serving reads. It then renames the tables and their
indexes, and upserts the manifest. Any failure rolls back and leaves the previous
snapshot in place. The lock is held only for the renames.

The API reads the manifest at startup. **Restart the API after a load** for the new
snapshot to take effect. On startup it logs `poi_snapshot.loaded` (source,
timestamp, row count). If there is no manifest row it logs
`poi_snapshot.not_loaded`. If the manifest cannot be read it logs
`poi_snapshot.unavailable`. In both failure cases every category uses Overpass.

Migration 0009 must be applied first (`alembic upgrade head`).

### Local development

```bash
# dev dependencies installed by `uv sync`
curl -LO https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf
uv run python -m app.poi_snapshot build --pbf new-zealand-latest.osm.pbf --out-dir /tmp/poi
DATABASE_URL=postgresql://gisuser:changeme@localhost:5432/gis \
  uv run python -m app.poi_snapshot load --dir /tmp/poi
```

Without a loaded snapshot, local development behaves as it did before this change
(everything from Overpass).

### Turn it off or roll back

- **Kill switch:** set `POI_SNAPSHOT_ENABLED=false` and restart. Every category goes
  to Overpass, and the manifest is not read.
- **Roll back to an older snapshot:** load the older release's assets, then restart.
  Keep at least the previous release published so this stays possible.

### Tests

- `uv run pytest` runs the extractor tests (against `docker/data/fixtures/ci-poi-sample.osm`)
  and the service routing tests. No database or Docker is needed.
- `POI_SNAPSHOT_DB_TESTS=1 uv run pytest tests/test_poi_snapshot_db.py` runs the
  loader and repository against live PostGIS. **It replaces the contents of
  `osm_poi`** with the fixture, so point it at a database where that is acceptable.
  CI does not set the variable.

## Accuracy

Spot checks on 2026-11-09 compared snapshot counts with live Overpass counts for
3 km around three city centres. The snapshot is from the 2026-11-08 extract, so
Overpass can be a day or more ahead. Overpass returned 502/504 on several queries,
so some cells are blank.

| Point | Category | Snapshot | Overpass |
|---|---|---|---|
| Auckland | schools | 26 | 26 |
| Auckland | parks | 117 | 117 |
| Auckland | bus stops | 334 | 334 |
| Auckland | hospitals | 7 | 7 |
| Wellington | schools | 28 | 28 |
| Wellington | parks | 90 | 90 |
| Wellington | hospitals | 3 | 3 |
| Christchurch | schools | 35 | 35 |
| Christchurch | parks | 128 | 129 |
| Christchurch | bus stops | 395 | 397 |

The remaining gaps were checked element by element:

- **Boundary cases (both bus stops and the park):** the snapshot uses PostGIS
  spheroid distance, and Overpass uses a spherical model. Elements about 3 km out
  fall on different sides of the edge. One bus stop is 2993 m spherical and 3000 m
  spheroid; the park's nearest outline point is 3000.65 m. These are the ~0.3%
  edge differences you would expect from two earth models.
- **Freshness:** the three elements were last edited in 2017–2024, so they are not
  recent edits. The gaps come from the earth model.
- **Site relations:** the NZ extract has 2 facility relations with no outline of
  their own: Rangiora High School and the Redwood railway station (both `type=site`).
  An earlier build skipped them, so Rangiora High School was missing. They are now
  resolved from their member ways and nodes, as Overpass resolves them. No facility
  relation is left unplaced (`relations_without_geometry` is 0 in the NZ build).

An earlier version of the builder matched on a way's centre point. It undercounted
Christchurch schools (27 against 35), because large school grounds reach the radius
even when their centre does not. The fix stores every outline point, which is how
Overpass `around:` matches. This is why the fixture contains a long school way whose
centre is about 1 km from its nearest node (`test_match_uses_outline_not_centre`).

Performance with the snapshot loaded, for all 14 categories in one fetch (3 km):
51 ms central Auckland, 27 ms central Christchurch, with no Overpass calls.

## Known limitations

- **Staleness:** the snapshot is as fresh as its last build. Monthly builds mean OSM
  edits take up to about a month to appear. Map-correction flows still use live
  Overpass.
- **Restart after load:** the manifest is read once at startup, like the scoring
  config.
- **Coverage follows the code:** the build uses `FACILITY_CONFIGS`. A facility type
  added only to the database (migration) is served by Overpass until the code's
  category definitions include it. The API logs `poi_snapshot.partial_coverage`
  with the uncovered categories at startup.
- **Boundary differences** described above (about 0.3% at the edge of the radius).
- **Not yet run in CI:** the workflow is committed but has not been dispatched.
  Its first run should be started by hand and checked.
- **Licensing:** OSM data is ODbL. Publishing the snapshot as a GitHub Release
  asset distributes a derived database publicly, so the ODbL share-alike and
  attribution terms apply to that release. The release notes carry the attribution.
  Confirm that this is acceptable before the first public release.

## Future option: self-hosted Overpass (not implemented)

This is the option we considered and set aside. Keep it in mind if the snapshot
stops being enough.

**What it would be:** run the Overpass API (its own PostgreSQL database and API
process) on the existing VM or a separate host, load the NZ extract into it, and
point `OVERPASS_URL` there. The query code would not change.

**Trade-offs:**

| | Snapshot (current) | Self-hosted Overpass |
|---|---|---|
| Query types | Only the tags in `FACILITY_CONFIGS` | Any OverpassQL |
| Freshness | Monthly rebuild, manual load | Re-import on a schedule, or minute diffs (more work) |
| Disk and RAM | About 4 MB snapshot; small table | Full OSM extract, much larger; the VM already ran out of memory during an earlier OSRM deploy |
| Ops | A monthly release plus a load step | A database, an API service, import jobs, upgrades, monitoring |
| Cost | Zero extra spend | Needs a larger VM or a second host |
| Upstream dependency | None at request time | None at request time, but the import is heavy |

**Revisit when:**

- The snapshot's staleness is not acceptable (for example, OSM edits must show up
  within days, not weeks), or
- Live OSM queries are needed on the request path (for example, the map-correction
  checks grow into a regular feature), or
- The category list grows far beyond what the snapshot covers.

Performance is not the reason to revisit. The snapshot path measured 27–51 ms for
all 14 categories. If queries become slow again, measure the PostGIS side first:
`EXPLAIN ANALYZE` on the `ST_DWithin` query in `poi_snapshot_repository.py`, and the
GiST index on `osm_poi.extent`.
