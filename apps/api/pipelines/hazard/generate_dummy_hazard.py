"""Phase-0 scaffold: generate a deterministic "demo_hazard" over a fixed
Auckland bbox and load it into the hazard_cells/hazard_cell_scores tables.

This proves the hazard pipeline end to end (grid generation -> DB -> API ->
UI) with fabricated but plausible data, before any real hazard source is
ingested (see apps/api/docs/HAZARD_SOURCES.md for what's actually available
to ingest next). Run via `scripts/setup-hazard-demo.sh`, which wraps:

    uv run python -m pipelines.hazard.generate_dummy_hazard

Idempotent: re-running upserts the same deterministic scores rather than
duplicating rows, matching scripts/setup-osrm.sh's re-runnable philosophy.
"""

import asyncio
import logging
import math
from datetime import UTC, date, datetime

import h3

from app.clients.osrm import haversine_km
from app.config.hazard_config import HAZARD_GRID_RESOLUTION
from app.config.settings import get_settings
from app.repositories.db.connection import close_pool, create_pool

logger = logging.getLogger(__name__)

HAZARD_TYPE_SLUG = "demo_hazard"
SOURCE_NAME = "Phase-0 Scaffold Dummy Generator"

# Roughly the Auckland urban area -- small enough to keep the scaffold's
# footprint tiny, large enough to exercise a real grid (~hundreds of cells
# at H3 res 7).
DEMO_BBOX = {
    "min_lat": -37.05,
    "max_lat": -36.6,
    "min_lon": 174.6,
    "max_lon": 174.95,
}

# A fixed, arbitrary point inside the bbox that the deterministic score
# falls off from -- not a real hazard center, just a repeatable spatial
# gradient so the demo data "looks like" a hazard instead of flat noise.
FAKE_HAZARD_CENTER = (-36.8485, 174.7633)  # central Auckland
DECAY_KM = 8.0


def _score_for_cell(h3_index: str) -> float:
    lat, lon = h3.cell_to_latlng(h3_index)
    distance_km = haversine_km(FAKE_HAZARD_CENTER[0], FAKE_HAZARD_CENTER[1], lat, lon)
    raw = 100.0 * math.exp(-distance_km / DECAY_KM)
    return round(min(100.0, max(0.0, raw)), 2)


def _cell_polygon_wkt(h3_index: str) -> str:
    """h3.cell_to_boundary returns (lat, lng) vertex pairs; PostGIS WKT wants
    (lon lat) order, and the ring must be explicitly closed."""
    boundary = h3.cell_to_boundary(h3_index)
    points = [(lng, lat) for lat, lng in boundary]
    points.append(points[0])
    coords = ", ".join(f"{lon} {lat}" for lon, lat in points)
    return f"POLYGON(({coords}))"


async def generate() -> None:
    settings = get_settings()
    pool = await create_pool(settings.database_url)

    try:
        polygon = h3.LatLngPoly(
            [
                (DEMO_BBOX["min_lat"], DEMO_BBOX["min_lon"]),
                (DEMO_BBOX["min_lat"], DEMO_BBOX["max_lon"]),
                (DEMO_BBOX["max_lat"], DEMO_BBOX["max_lon"]),
                (DEMO_BBOX["max_lat"], DEMO_BBOX["min_lon"]),
            ]
        )
        cells = list(h3.polygon_to_cells(polygon, HAZARD_GRID_RESOLUTION))
        logger.info("Generating %d demo hazard cells over the Auckland bbox", len(cells))

        today = date.today()
        now = datetime.now(UTC)

        async with pool.acquire() as conn:
            async with conn.transaction():
                # hazard_sources has no unique constraint (a genuine ingest
                # source may legitimately post multiple batches over time),
                # so idempotency here is a plain look-before-insert rather
                # than ON CONFLICT -- re-running this script must reuse the
                # same source row, not accumulate a new one every time.
                source_id = await conn.fetchval(
                    "SELECT id FROM hazard_sources WHERE hazard_type_slug = $1 "
                    "AND source_name = $2 ORDER BY id LIMIT 1",
                    HAZARD_TYPE_SLUG,
                    SOURCE_NAME,
                )
                if source_id is None:
                    source_id = await conn.fetchval(
                        """
                        INSERT INTO hazard_sources
                            (hazard_type_slug, source_name, licence, endpoint,
                             attribution, fetch_date, data_currency_date, notes)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING id
                        """,
                        HAZARD_TYPE_SLUG,
                        SOURCE_NAME,
                        "N/A -- fabricated demo data, not a real licensed dataset",
                        None,
                        "Location Intelligence Phase-0 scaffold (no real source)",
                        today,
                        today,
                        "Deterministic exponential falloff from a fixed fake center point; "
                        "not a real hazard assessment.",
                    )

                for h3_index in cells:
                    score = _score_for_cell(h3_index)
                    wkt = _cell_polygon_wkt(h3_index)
                    severe = score >= 80.0

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
                        today,
                        now,
                    )

        logger.info("Demo hazard data loaded: %d cells", len(cells))
    finally:
        await close_pool(pool)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(generate())


if __name__ == "__main__":
    main()
