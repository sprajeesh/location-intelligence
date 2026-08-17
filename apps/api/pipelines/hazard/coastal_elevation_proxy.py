"""Phase-1: ingest a real "coastal_elevation_proxy" hazard, derived from
LINZ's public elevation data and coastline layer, over the same bbox
generate_dummy_hazard.py uses (so the new real layer can be visually
compared against the fabricated demo_hazard layer on the same map view).

Two LINZ sources, both verified this session (see
apps/api/docs/HAZARD_SOURCES.md section G):
  - Elevation: s3://nz-elevation (public, CC-BY-4.0, no API key) -- DEM COG
    tiles read directly over HTTP via GDAL's /vsicurl/ virtual filesystem.
  - Coastline: LDS layer 124391 "NZ Coastline - Mean High Water Springs
    Polygon" (CC BY 4.0 -- NOT its sibling layer 124388, which is
    CC BY-NC 4.0 and must not be used), fetched via WFS with settings.linz_api_key.

Scoring rule (HAZARD.md requires an explicit, documented rule per hazard):
low elevation close to the coast scores high, standing in for a national
tsunami model that does not exist as a public bulk dataset today. See
_score_for_cell.

Run via `scripts/setup-hazard-coastal-proxy.sh`, which wraps:

    uv run python -m pipelines.hazard.coastal_elevation_proxy

Requires LINZ_API_KEY set in apps/api/.env. Idempotent: re-running upserts
the same cells/scores rather than duplicating rows, matching
generate_dummy_hazard.py's re-runnable philosophy.
"""

import asyncio
import json
import logging
from datetime import UTC, date, datetime

import h3
import httpx

from app.config.hazard_config import HAZARD_GRID_RESOLUTION
from app.config.settings import get_settings
from app.repositories.db.connection import close_pool, create_pool
from pipelines.hazard.generate_dummy_hazard import DEMO_BBOX

logger = logging.getLogger(__name__)

HAZARD_TYPE_SLUG = "coastal_elevation_proxy"

# -- LINZ Data Service coastline layer -- see HAZARD_SOURCES.md section G for
# why 124391 (plain CC BY 4.0) and not its sibling 124388 (CC BY-NC 4.0).
COASTLINE_LAYER_ID = "124391"
COASTLINE_SOURCE_NAME = (
    'LINZ Data Service layer 124391 "NZ Coastline - Mean High Water Springs Polygon"'
)
COASTLINE_LICENCE = "CC BY 4.0 International"
COASTLINE_ATTRIBUTION = (
    "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence"
)
# LDS layer metadata as last confirmed (2026-08-17) via
# https://data.linz.govt.nz/services/api/v1/layers/124391/ -- re-check if
# this pipeline is re-run long after that date.
COASTLINE_DATA_CURRENCY_DATE = date(2026, 5, 6)

# -- LINZ public elevation bucket -- the demo bbox is fully covered by this
# one collection (confirmed this session), so it's hardcoded for now rather
# than doing a full national STAC catalog traversal. Expanding coverage
# later means adding more collection URLs, not rewriting this pipeline.
ELEVATION_SOURCE_NAME = "LINZ elevation (s3://nz-elevation, Auckland North 2016-2018, 1m DEM)"
ELEVATION_LICENCE = "CC BY 4.0 International"
ELEVATION_ATTRIBUTION = (
    "Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence"
)
ELEVATION_BUCKET_BASE = "https://nz-elevation.s3.ap-southeast-2.amazonaws.com"
ELEVATION_COLLECTION_URL = (
    f"{ELEVATION_BUCKET_BASE}/auckland/auckland-north_2016-2018/dem_1m/2193/collection.json"
)
# Survey capture end date, from this collection's own STAC temporal extent
# (confirmed this session) -- more honest than "today" for real source data.
ELEVATION_DATA_CURRENCY_DATE = date(2018, 8, 8)

# Scoring rule constants (see _score_for_cell) -- documented, adjustable.
# SEVERE_THRESHOLD mirrors this hazard type's severe_threshold in migration
# 0004/hazard_config.py; kept as a literal here too since pipeline code
# deliberately doesn't import the DB-seeding migration (same reasoning as
# 0003/0004 not importing app/config/hazard_config.py).
COASTAL_BUFFER_KM = 10.0
ELEVATION_CAP_M = 10.0
SEVERE_THRESHOLD = 70.0

# A score blending two sources is only as current as its stalest input.
COMBINED_DATA_CURRENCY_DATE = min(ELEVATION_DATA_CURRENCY_DATE, COASTLINE_DATA_CURRENCY_DATE)


def _cell_polygon_wkt(h3_index: str) -> str:
    """h3.cell_to_boundary returns (lat, lng) vertex pairs; PostGIS WKT wants
    (lon lat) order, and the ring must be explicitly closed."""
    boundary = h3.cell_to_boundary(h3_index)
    points = [(lng, lat) for lat, lng in boundary]
    points.append(points[0])
    coords = ", ".join(f"{lon} {lat}" for lon, lat in points)
    return f"POLYGON(({coords}))"


def _score_for_cell(elevation_m: float, distance_km: float) -> float | None:
    """Low elevation close to the coast scores high; beyond COASTAL_BUFFER_KM
    the proxy doesn't apply at all (None -- no row inserted for this hazard
    type, an honest "not covered by this proxy" rather than a fabricated
    zero, matching HazardScoringService's existing no-coverage semantics)."""
    if distance_km > COASTAL_BUFFER_KM:
        return None
    proximity_factor = 1 - (distance_km / COASTAL_BUFFER_KM)
    elevation_factor = 1 - (min(max(elevation_m, 0.0), ELEVATION_CAP_M) / ELEVATION_CAP_M)
    return round(100 * proximity_factor * elevation_factor, 2)


def _find_covering_tile(
    tiles: list[tuple[tuple[float, float, float, float], str]], lat: float, lon: float
) -> str | None:
    """tiles: [((min_lon, min_lat, max_lon, max_lat), tiff_url), ...]. Returns
    the href of the first tile whose bbox contains the point, or None if the
    point falls outside every known tile (e.g. open water)."""
    for (min_lon, min_lat, max_lon, max_lat), href in tiles:
        if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
            return href
    return None


async def _load_dem_tile_index(
    client: httpx.AsyncClient,
) -> list[tuple[tuple[float, float, float, float], str]]:
    """Fetches the collection's item list, then each item's own STAC JSON
    (bbox isn't exposed at the collection-link level) to build a
    [(bbox, tiff_url), ...] index. Concurrency-capped since this collection
    has ~163 tiles and we're being a polite anonymous client against a
    shared public bucket."""
    collection = (await client.get(ELEVATION_COLLECTION_URL)).raise_for_status().json()
    item_hrefs = [link["href"] for link in collection["links"] if link.get("rel") == "item"]
    collection_base = ELEVATION_COLLECTION_URL.rsplit("/", 1)[0]

    semaphore = asyncio.Semaphore(10)

    async def _fetch_item(href: str) -> tuple[tuple[float, float, float, float], str]:
        item_url = f"{collection_base}/{href.removeprefix('./')}"
        async with semaphore:
            response = await client.get(item_url)
        response.raise_for_status()
        item = response.json()
        bbox = tuple(item["bbox"])
        asset_href = item["assets"]["visual"]["href"]
        tiff_url = f"{collection_base}/{asset_href.removeprefix('./')}"
        return bbox, tiff_url

    return await asyncio.gather(*(_fetch_item(href) for href in item_hrefs))


def _sample_elevation(tiff_url: str, lat: float, lon: float) -> float | None:
    """Blocking (rasterio has no native async API) -- call via
    asyncio.to_thread. Returns None if the point falls in a nodata pixel
    (e.g. a small gap in LiDAR coverage within an otherwise-covering tile)
    or just outside the raster's actual pixel grid -- a tile's STAC bbox is
    a bounding rectangle of its (possibly non-rectangular, reprojected)
    coverage, so a point inside the bbox can still land beyond the raster's
    real width/height at the edges."""
    import rasterio
    from rasterio.warp import transform as warp_transform

    vsicurl_url = tiff_url.replace("https://", "/vsicurl/https://")
    with rasterio.open(vsicurl_url) as dataset:
        (x,), (y,) = warp_transform("EPSG:4326", dataset.crs, [lon], [lat])
        row, col = dataset.index(x, y)
        if not (0 <= row < dataset.height and 0 <= col < dataset.width):
            return None
        value = dataset.read(1, window=((row, row + 1), (col, col + 1)))[0, 0]
        nodata = dataset.nodata
        if nodata is not None and value == nodata:
            return None
        return float(value)


async def _fetch_coastline_geometries(
    client: httpx.AsyncClient, api_key: str, bbox: dict
) -> list[str]:
    """Returns the raw GeoJSON geometry (not Feature) of each coastline
    polygon intersecting bbox, as JSON strings ready for PostGIS's
    ST_GeomFromGeoJSON -- multiple features (e.g. islands, inlets) are
    common near a real coastline, so this returns a list, not one geometry.

    Uses an explicit CQL_FILTER with BBOX() naming the geometry column
    ("Shape", confirmed via LDS's layer metadata API) rather than WFS's
    plain `bbox` shorthand parameter -- live-tested this session: the
    shorthand silently matched zero features against this layer (its
    non-default geometry column name isn't auto-detected), while
    CQL_FILTER against "Shape" correctly returned real features.

    The returned geometries are in this layer's native storage CRS
    (NZTM2000, EPSG:2193), NOT WGS84, despite being GeoJSON -- confirmed
    via the response's own top-level "crs" field. Callers must tag them
    2193, not 4326, when loading into PostGIS (see ingest()'s distance
    query) -- tagging as 4326 produces nonsense coordinates and PostGIS's
    ST_Transform fails outright rather than silently misplacing them.
    """
    url = f"https://data.linz.govt.nz/services;key={api_key}/wfs"
    cql_filter = (
        f"BBOX(Shape,{bbox['min_lon']},{bbox['min_lat']},"
        f"{bbox['max_lon']},{bbox['max_lat']},'EPSG:4326')"
    )
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": f"layer-{COASTLINE_LAYER_ID}",
        "outputFormat": "json",
        "CQL_FILTER": cql_filter,
    }
    response = await client.get(url, params=params)
    response.raise_for_status()
    feature_collection = response.json()
    return [json.dumps(f["geometry"]) for f in feature_collection.get("features", [])]


async def ingest(bbox: dict = DEMO_BBOX) -> None:
    settings = get_settings()
    if not settings.linz_api_key:
        raise RuntimeError(
            "LINZ_API_KEY is not set in apps/api/.env -- required to query the "
            "coastline WFS layer. See .env.example."
        )

    pool = await create_pool(settings.database_url)

    try:
        polygon = h3.LatLngPoly(
            [
                (bbox["min_lat"], bbox["min_lon"]),
                (bbox["min_lat"], bbox["max_lon"]),
                (bbox["max_lat"], bbox["max_lon"]),
                (bbox["max_lat"], bbox["min_lon"]),
            ]
        )
        cells = list(h3.polygon_to_cells(polygon, HAZARD_GRID_RESOLUTION))
        logger.info("Ingesting coastal_elevation_proxy over %d cells", len(cells))

        today = date.today()
        now = datetime.now(UTC)

        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info("Fetching coastline geometries (layer %s)...", COASTLINE_LAYER_ID)
            coastline_geometries = await _fetch_coastline_geometries(
                client, settings.linz_api_key, bbox
            )
            if not coastline_geometries:
                raise RuntimeError(
                    f"No coastline features returned for bbox {bbox} -- check "
                    "LINZ_API_KEY scope (needs WFS access) and the bbox itself."
                )
            logger.info("Fetched %d coastline feature(s)", len(coastline_geometries))

            logger.info("Building DEM tile index from %s...", ELEVATION_COLLECTION_URL)
            dem_tiles = await _load_dem_tile_index(client)
            logger.info("Indexed %d DEM tiles", len(dem_tiles))

        async with pool.acquire() as conn:
            async with conn.transaction():
                for h3_index in cells:
                    wkt = _cell_polygon_wkt(h3_index)
                    await conn.execute(
                        """
                        INSERT INTO hazard_cells (h3_index, resolution, geom, updated_at)
                        VALUES ($1, $2, ST_GeomFromText($3, 4326), $4)
                        ON CONFLICT (h3_index)
                        DO UPDATE SET geom = EXCLUDED.geom, updated_at = EXCLUDED.updated_at
                        """,
                        h3_index,
                        HAZARD_GRID_RESOLUTION,
                        wkt,
                        now,
                    )

                distance_rows = await conn.fetch(
                    """
                    WITH coastline AS (
                        -- LDS's WFS returns this layer's geometry in its native
                        -- storage CRS (NZTM2000, EPSG:2193), not WGS84, despite
                        -- being GeoJSON -- confirmed via the response's own
                        -- top-level "crs" field. Tagging it 4326 here would
                        -- silently produce nonsense coordinates and fail
                        -- ST_Transform with "Invalid coordinate".
                        SELECT ST_SetSRID(ST_GeomFromGeoJSON(g), 2193) AS geom
                        FROM unnest($1::text[]) AS g
                    )
                    SELECT hc.h3_index,
                           MIN(ST_Distance(ST_Transform(hc.geom, 2193), c.geom))
                               AS distance_m
                    FROM hazard_cells hc
                    CROSS JOIN coastline c
                    WHERE hc.h3_index = ANY($2)
                    GROUP BY hc.h3_index
                    """,
                    coastline_geometries,
                    cells,
                )
                distance_km_by_cell = {
                    row["h3_index"]: row["distance_m"] / 1000.0 for row in distance_rows
                }

                elevation_source_id = await _get_or_create_source(
                    conn,
                    ELEVATION_SOURCE_NAME,
                    ELEVATION_LICENCE,
                    ELEVATION_COLLECTION_URL,
                    ELEVATION_ATTRIBUTION,
                    today,
                    ELEVATION_DATA_CURRENCY_DATE,
                    "1m LiDAR DEM, point-sampled at each H3 cell centroid.",
                )
                # Recorded as its own hazard_sources row per HAZARD.md's
                # "record provenance per layer" mandate, even though it
                # isn't the row hazard_cell_scores.source_id points to below
                # -- that FK can only reference one row, and elevation is
                # the input that actually varies the score once a cell is
                # within the coastal buffer (distance only gates whether the
                # proxy applies at all). This row still exists for
                # attribution/audit of the coastline data specifically.
                _coastline_source_id = await _get_or_create_source(
                    conn,
                    COASTLINE_SOURCE_NAME,
                    COASTLINE_LICENCE,
                    f"https://data.linz.govt.nz/layer/{COASTLINE_LAYER_ID}",
                    COASTLINE_ATTRIBUTION,
                    today,
                    COASTLINE_DATA_CURRENCY_DATE,
                    "Distance from each H3 cell centroid to the nearest coastline "
                    "polygon boundary, computed via PostGIS ST_Distance in EPSG:2193.",
                )
                source_id = elevation_source_id

                scored = 0
                skipped_no_tile = 0
                skipped_beyond_buffer = 0
                for h3_index in cells:
                    distance_km = distance_km_by_cell.get(h3_index)
                    if distance_km is None:
                        continue
                    if distance_km > COASTAL_BUFFER_KM:
                        skipped_beyond_buffer += 1
                        continue

                    lat, lon = h3.cell_to_latlng(h3_index)
                    tile_href = _find_covering_tile(dem_tiles, lat, lon)
                    if tile_href is None:
                        skipped_no_tile += 1
                        continue

                    elevation_m = await asyncio.to_thread(_sample_elevation, tile_href, lat, lon)
                    if elevation_m is None:
                        skipped_no_tile += 1
                        continue

                    score = _score_for_cell(elevation_m, distance_km)
                    if score is None:
                        skipped_beyond_buffer += 1
                        continue

                    severe = score >= SEVERE_THRESHOLD
                    await conn.execute(
                        """
                        INSERT INTO hazard_cell_scores
                            (h3_index, hazard_type_slug, score, severe, source_id,
                             data_currency_date, computed_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (h3_index, hazard_type_slug)
                        DO UPDATE SET
                            score = EXCLUDED.score,
                            severe = EXCLUDED.severe,
                            source_id = EXCLUDED.source_id,
                            data_currency_date = EXCLUDED.data_currency_date,
                            computed_at = EXCLUDED.computed_at
                        """,
                        h3_index,
                        HAZARD_TYPE_SLUG,
                        score,
                        severe,
                        source_id,
                        COMBINED_DATA_CURRENCY_DATE,
                        now,
                    )
                    scored += 1

        logger.info(
            "coastal_elevation_proxy loaded: %d scored, %d beyond coastal buffer, "
            "%d skipped (no DEM coverage)",
            scored,
            skipped_beyond_buffer,
            skipped_no_tile,
        )
    finally:
        await close_pool(pool)


async def _get_or_create_source(
    conn,
    source_name: str,
    licence: str,
    endpoint: str,
    attribution: str,
    fetch_date: date,
    data_currency_date: date,
    notes: str,
) -> int:
    """Look-before-insert, matching generate_dummy_hazard.py's pattern --
    hazard_sources has no unique constraint, so re-running this pipeline
    must reuse the same source row rather than accumulating a new one."""
    source_id = await conn.fetchval(
        "SELECT id FROM hazard_sources WHERE hazard_type_slug = $1 "
        "AND source_name = $2 ORDER BY id LIMIT 1",
        HAZARD_TYPE_SLUG,
        source_name,
    )
    if source_id is not None:
        return source_id
    return await conn.fetchval(
        """
        INSERT INTO hazard_sources
            (hazard_type_slug, source_name, licence, endpoint,
             attribution, fetch_date, data_currency_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        """,
        HAZARD_TYPE_SLUG,
        source_name,
        licence,
        endpoint,
        attribution,
        fetch_date,
        data_currency_date,
        notes,
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(ingest())


if __name__ == "__main__":
    main()
