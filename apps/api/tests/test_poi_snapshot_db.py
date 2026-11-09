"""POI snapshot: loader and repository against live PostGIS (migration 0009).

The loader replaces the live `osm_poi` table, so these tests run only when
explicitly enabled:

    POI_SNAPSHOT_DB_TESTS=1 uv run pytest tests/test_poi_snapshot_db.py

Point DATABASE_URL at a database you are happy to refresh with the fixture
snapshot. They are skipped otherwise, so the unit-test job passes without Docker.
"""

import gzip
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import text

from app.clients.overpass import parse_category_elements
from app.config.settings import get_settings
from app.poi_snapshot.extract import extract_rows, snapshot_tag_pairs, write_extract
from app.poi_snapshot.load import load_snapshot
from app.repositories.db.connection import create_engine, create_session_factory
from app.repositories.db.poi_snapshot_repository import PoiSnapshotRepository

FIXTURE = Path(__file__).resolve().parents[3] / "docker/data/fixtures/ci-poi-sample.osm"

# The fixture school node sits at this point. The bus stop is ~140 m away and the
# hospitals are ~1.1 km away.
LAT = -36.85
LON = 174.76

pytestmark = pytest.mark.skipif(
    os.environ.get("POI_SNAPSHOT_DB_TESTS") != "1",
    reason="set POI_SNAPSHOT_DB_TESTS=1 to run; the loader replaces osm_poi",
)


@pytest.fixture
def database_url() -> str:
    return get_settings().database_url


@pytest.fixture
def snapshot_dir(tmp_path: Path) -> Path:
    pairs = snapshot_tag_pairs()
    write_extract(
        extract_rows(FIXTURE, pairs),
        tmp_path,
        source_name="test-fixture",
        source_timestamp=datetime(2026, 11, 8, 21, tzinfo=UTC),
        tag_pairs=pairs,
    )
    return tmp_path


@pytest.fixture
async def loaded(database_url: str, snapshot_dir: Path):  # type: ignore[no-untyped-def]
    """Database with the fixture snapshot loaded; yields a session factory."""
    engine = create_engine(
        database_url,
        pool_size=1,
        max_overflow=0,
        pool_recycle_seconds=60,
        statement_timeout_ms=10_000,
    )
    factory = create_session_factory(engine)
    load_snapshot(database_url, snapshot_dir)
    yield factory
    await engine.dispose()


def _ids(elements: list[dict]) -> set[tuple[str, int]]:
    return {(e["type"], e["id"]) for e in elements}


async def test_manifest_describes_the_loaded_snapshot(loaded) -> None:  # type: ignore[no-untyped-def]
    manifest = await PoiSnapshotRepository(loaded).load_manifest()
    assert manifest is not None
    assert manifest.source_name == "test-fixture"
    assert manifest.row_count == 6
    assert manifest.tag_pairs == frozenset(snapshot_tag_pairs())


async def test_find_elements_near_respects_radius(loaded) -> None:  # type: ignore[no-untyped-def]
    repo = PoiSnapshotRepository(loaded)
    pairs = [("amenity", "school"), ("highway", "bus_stop"), ("amenity", "hospital")]

    close = await repo.find_elements_near(pairs, LAT, LON, 300)
    # School (0 m), long school footprint and site school (their nodes are at the same
    # point), bus stop (~140 m).
    assert _ids(close) == {("node", 1001), ("node", 1002), ("way", 2051), ("relation", 3002)}

    wide = await repo.find_elements_near(pairs, LAT, LON, 3000)
    assert _ids(wide) == {
        ("node", 1001),
        ("node", 1002),
        ("way", 2001),
        ("way", 2051),
        ("relation", 3001),
        ("relation", 3002),
    }


async def test_match_uses_outline_not_centre(loaded) -> None:  # type: ignore[no-untyped-def]
    """The long school's centre is ~890 m east of this point, but one of its nodes
    is at the point itself. Overpass `around:` returns it; a centre-only match would
    not. This is the regression that motivated storing the outline."""
    repo = PoiSnapshotRepository(loaded)
    elements = await repo.find_elements_near([("amenity", "school")], -36.85, 174.749, 500)
    assert _ids(elements) == {("way", 2051), ("relation", 3002)}

    # The reported position is still the bounding-box centre, as `out center` gives.
    centre = elements[0]["center"]
    assert centre["lon"] == pytest.approx(174.76)
    assert centre["lat"] == pytest.approx(-36.85)


async def test_find_elements_near_filters_by_tag_pair(loaded) -> None:  # type: ignore[no-untyped-def]
    repo = PoiSnapshotRepository(loaded)
    elements = await repo.find_elements_near([("amenity", "school")], LAT, LON, 3000)
    assert _ids(elements) == {("node", 1001), ("way", 2051), ("relation", 3002)}


async def test_find_elements_near_returns_overpass_shape(loaded) -> None:  # type: ignore[no-untyped-def]
    repo = PoiSnapshotRepository(loaded)
    elements = await repo.find_elements_near(
        [("highway", "bus_stop"), ("amenity", "hospital")], LAT, LON, 3000
    )
    by_id = {(e["type"], e["id"]): e for e in elements}
    assert by_id[("node", 1002)]["lat"] == pytest.approx(-36.851)
    assert "center" in by_id[("way", 2001)]
    assert "lat" not in by_id[("way", 2001)]


async def test_empty_pairs_return_nothing(loaded) -> None:  # type: ignore[no-untyped-def]
    assert await PoiSnapshotRepository(loaded).find_elements_near([], LAT, LON, 3000) == []


async def test_snapshot_elements_parse_into_facilities(loaded) -> None:  # type: ignore[no-untyped-def]
    repo = PoiSnapshotRepository(loaded)
    tags = [("amenity", "school")]
    elements = await repo.find_elements_near(tags, LAT, LON, 3000)
    parsed = parse_category_elements(elements, [("schools", tags, 3000)])
    assert sorted(f["name"] for f in parsed["schools"]) == [
        "Fixture Long School",
        "Fixture School",
        "Fixture Site School",
    ]


async def test_failed_load_rolls_back_and_keeps_previous_snapshot(  # type: ignore[no-untyped-def]
    loaded, database_url: str, tmp_path: Path, snapshot_dir: Path
) -> None:
    """A row the table rejects must abort the whole swap, leaving the old data."""
    before = await PoiSnapshotRepository(loaded).load_manifest()
    assert before is not None and before.row_count == 6

    bad_dir = tmp_path / "bad"
    bad_dir.mkdir()
    with gzip.open(bad_dir / "poi-snapshot.ndjson.gz", "wt", encoding="utf-8") as fh:
        fh.write(json.dumps({"t": "planet", "i": 1, "pts": [[0.0, 0.0]], "tags": {}}) + "\n")
    manifest = json.loads((snapshot_dir / "poi-snapshot.manifest.json").read_text())
    manifest["row_count"] = 1
    (bad_dir / "poi-snapshot.manifest.json").write_text(json.dumps(manifest))

    with pytest.raises(Exception):  # psycopg.errors.CheckViolation
        load_snapshot(database_url, bad_dir)

    after = await PoiSnapshotRepository(loaded).load_manifest()
    assert after == before
    elements = await PoiSnapshotRepository(loaded).find_elements_near(
        [("amenity", "school")], LAT, LON, 3000
    )
    assert _ids(elements) == {("node", 1001), ("way", 2051), ("relation", 3002)}

    async with loaded() as session:
        tables = (
            (
                await session.execute(
                    text(
                        "SELECT tablename FROM pg_tables WHERE tablename LIKE 'osm_poi%' ORDER BY 1"
                    )
                )
            )
            .scalars()
            .all()
        )
    # The live table and the manifest only. The staging and previous tables must be gone.
    assert tables == ["osm_poi", "osm_poi_snapshot"]
