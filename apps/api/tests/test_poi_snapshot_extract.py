"""POI snapshot extraction from an OSM file (app/poi_snapshot/extract.py).

Runs pyosmium against docker/data/fixtures/ci-poi-sample.osm, so no network and
no Docker are needed.
"""

import gzip
import json
from datetime import UTC, datetime
from pathlib import Path

from app.config.scoring_config import FACILITY_CONFIGS
from app.poi_snapshot.extract import (
    MANIFEST_FILENAME,
    ROWS_FILENAME,
    ExtractStats,
    extract_rows,
    snapshot_tag_pairs,
    write_extract,
)

FIXTURE = Path(__file__).resolve().parents[3] / "docker/data/fixtures/ci-poi-sample.osm"

EXPECTED_IDS = {
    ("node", 1001),
    ("node", 1002),
    ("way", 2001),
    ("way", 2051),
    ("relation", 3001),
    ("relation", 3002),
}


def _rows() -> dict:
    return {(row.osm_type, row.osm_id): row for row in extract_rows(FIXTURE, snapshot_tag_pairs())}


def test_tag_pairs_cover_every_facility_config_pair() -> None:
    expected = {pair for cfg in FACILITY_CONFIGS.values() for pair in cfg.osm_tags}
    assert set(snapshot_tag_pairs()) == expected
    assert ("amenity", "restaurant") in snapshot_tag_pairs()  # Food & Drink (0005)


def test_extracts_matching_elements_only() -> None:
    # Crossing (highway=crossing) and the residential road must not appear.
    assert set(_rows()) == EXPECTED_IDS


def test_closed_way_is_emitted_once() -> None:
    # pyosmium yields closed ways as both Way and Area; the extractor dedupes them.
    keys = [(row.osm_type, row.osm_id) for row in extract_rows(FIXTURE, snapshot_tag_pairs())]
    assert len(keys) == len(set(keys)) == len(EXPECTED_IDS)


def test_way_keeps_all_outline_points_not_just_the_centre() -> None:
    """Overpass `around:` matches a way when any node is in range, so the snapshot
    must keep the outline. A centre-only row would drop long footprints."""
    long_school = _rows()[("way", 2051)]
    assert set(long_school.points) == {(174.75, -36.85), (174.76, -36.85), (174.77, -36.85)}

    closed_way = _rows()[("way", 2001)]
    # The closing node repeats the first one; it must appear once.
    assert len(closed_way.points) == len(set(closed_way.points)) == 4


def test_site_relation_is_resolved_from_its_member_way() -> None:
    """A site relation has no outline of its own. Overpass returns it through its
    members, so the extractor takes the member way's points."""
    site = _rows()[("relation", 3002)]
    assert set(site.points) == {(174.75, -36.85), (174.76, -36.85), (174.77, -36.85)}
    assert site.tags["amenity"] == "school"


def test_relation_keeps_outer_ring_points() -> None:
    relation = _rows()[("relation", 3001)]
    assert set(relation.points) == {
        (174.77, -36.851),
        (174.771, -36.851),
        (174.771, -36.85),
        (174.77, -36.85),
    }


def test_stored_tags_keep_matched_name_and_detail_keys() -> None:
    school = _rows()[("node", 1001)]
    assert school.tags == {
        "amenity": "school",
        "name": "Fixture School",
        "phone": "+64 9 000 0001",
    }


def test_write_extract_writes_rows_and_manifest(tmp_path: Path) -> None:
    pairs = snapshot_tag_pairs()
    manifest = write_extract(
        extract_rows(FIXTURE, pairs),
        tmp_path,
        source_name="test-source",
        source_timestamp=datetime(2026, 11, 8, 21, tzinfo=UTC),
        tag_pairs=pairs,
        built_at=datetime(2026, 11, 9, tzinfo=UTC),
    )

    assert manifest["row_count"] == len(EXPECTED_IDS)
    on_disk = json.loads((tmp_path / MANIFEST_FILENAME).read_text())
    assert on_disk == manifest
    assert [list(p) for p in pairs] == on_disk["tag_pairs"]

    with gzip.open(tmp_path / ROWS_FILENAME, "rt", encoding="utf-8") as fh:
        records = [json.loads(line) for line in fh if line.strip()]
    assert {(r["t"], r["i"]) for r in records} == EXPECTED_IDS
    long_school = next(r for r in records if (r["t"], r["i"]) == ("way", 2051))
    assert len(long_school["pts"]) == 3


def test_stats_report_no_unplaceable_relations_for_fixture() -> None:
    stats = ExtractStats()
    list(extract_rows(FIXTURE, snapshot_tag_pairs(), stats))
    assert stats.relations_without_geometry == 0
    assert stats.ways_missing_locations == 0


def test_load_path_does_not_need_pyosmium() -> None:
    """The production image installs without dev dependencies, so the load command
    must import cleanly with osmium unavailable."""
    import subprocess
    import sys

    code = (
        "import sys; sys.modules['osmium'] = None; "
        "import app.poi_snapshot.__main__, app.poi_snapshot.load; "
        "import app.repositories.db.poi_snapshot_repository; "
        "print('ok')"
    )
    result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "ok"
