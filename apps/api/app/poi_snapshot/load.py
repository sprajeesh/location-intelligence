"""Load a built POI snapshot into PostGIS, replacing `osm_poi` atomically.

The whole load runs in one transaction:
  1. COPY the rows into a temp table and build `osm_poi_next` from them, with
     its indexes, while readers keep using the live `osm_poi`.
  2. Swap: rename `osm_poi` to `osm_poi_previous`, rename `osm_poi_next` to
     `osm_poi`, and move the index names across to match.
  3. Upsert the single manifest row.

Readers see the old snapshot until the commit and the new one after it. The
lock is held only for the renames, not for the COPY. A failure at any point
rolls back and leaves the live table untouched.
"""

import gzip
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import psycopg

from app.poi_snapshot.files import MANIFEST_FILENAME, ROWS_FILENAME


@dataclass(frozen=True)
class LoadResult:
    row_count: int
    source_name: str
    source_timestamp: datetime


def _sync_url(database_url: str) -> str:
    """psycopg wants a plain postgresql:// DSN, not the SQLAlchemy asyncpg form."""
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)


def _multipoint_wkt(points: list[list[float]]) -> str:
    """MULTIPOINT WKT (x y = lon lat) for an element's outline points."""
    return "MULTIPOINT(" + ",".join(f"({x!r} {y!r})" for x, y in points) + ")"


def load_snapshot(database_url: str, snapshot_dir: str | Path) -> LoadResult:
    """Load `ROWS_FILENAME` + `MANIFEST_FILENAME` from `snapshot_dir` into the database."""
    snapshot_dir = Path(snapshot_dir)
    manifest = json.loads((snapshot_dir / MANIFEST_FILENAME).read_text(encoding="utf-8"))
    rows_path = snapshot_dir / ROWS_FILENAME
    built_at = manifest["built_at"]
    source_timestamp = manifest["source_timestamp"]

    row_count = 0
    with psycopg.connect(_sync_url(database_url), autocommit=False) as conn:
        with conn.transaction(), conn.cursor() as cur:
            cur.execute(
                """
                CREATE TEMP TABLE poi_raw (
                    osm_type TEXT,
                    osm_id BIGINT,
                    wkt TEXT,
                    tags TEXT
                ) ON COMMIT DROP
                """
            )
            with (
                cur.copy("COPY poi_raw (osm_type, osm_id, wkt, tags) FROM STDIN") as copy,
                gzip.open(rows_path, "rt", encoding="utf-8") as lines,
            ):
                for line in lines:
                    if not line.strip():
                        continue
                    record = json.loads(line)
                    copy.write_row(
                        (
                            record["t"],
                            record["i"],
                            _multipoint_wkt(record["pts"]),
                            json.dumps(record["tags"], separators=(",", ":")),
                        )
                    )
                    row_count += 1

            # Refuse an empty or inconsistent file before anything is swapped. An
            # empty snapshot would mark every category as covered and return no
            # facilities, with no Overpass fallback.
            if row_count == 0 or row_count != manifest["row_count"]:
                raise ValueError(
                    f"Refusing to load snapshot: read {row_count} rows, "
                    f"manifest says {manifest['row_count']}"
                )

            cur.execute("DROP TABLE IF EXISTS osm_poi_next")
            # LIKE copies columns and NOT NULL only. CHECK constraints are declared
            # here explicitly (as in migration 0009). Copying them from osm_poi would
            # not work: once a load has replaced osm_poi, its constraints are gone too.
            cur.execute("CREATE TABLE osm_poi_next (LIKE osm_poi)")
            cur.execute(
                "ALTER TABLE osm_poi_next ADD CONSTRAINT ck_osm_poi_type "
                "CHECK (osm_type IN ('node', 'way', 'relation'))"
            )
            cur.execute(
                """
                INSERT INTO osm_poi_next (osm_type, osm_id, extent, tags)
                SELECT osm_type, osm_id, ST_GeogFromText(wkt), tags::jsonb
                FROM poi_raw
                """
            )
            cur.execute(
                "CREATE UNIQUE INDEX ix_osm_poi_next_element ON osm_poi_next (osm_type, osm_id)"
            )
            cur.execute("CREATE INDEX ix_osm_poi_next_extent ON osm_poi_next USING GIST (extent)")
            cur.execute(
                "CREATE INDEX ix_osm_poi_next_tags ON osm_poi_next USING GIN (tags jsonb_path_ops)"
            )
            cur.execute("ANALYZE osm_poi_next")

            # Swap. Index names must be freed before they are reused, and
            # ALTER INDEX works on the index regardless of its table's name.
            cur.execute("DROP TABLE IF EXISTS osm_poi_previous")
            cur.execute("ALTER TABLE osm_poi RENAME TO osm_poi_previous")
            cur.execute("ALTER INDEX ux_osm_poi_element RENAME TO ux_osm_poi_previous_element")
            cur.execute("ALTER INDEX ix_osm_poi_extent RENAME TO ix_osm_poi_previous_extent")
            cur.execute("ALTER INDEX ix_osm_poi_tags RENAME TO ix_osm_poi_previous_tags")
            cur.execute("ALTER TABLE osm_poi_next RENAME TO osm_poi")
            cur.execute("ALTER INDEX ix_osm_poi_next_element RENAME TO ux_osm_poi_element")
            cur.execute("ALTER INDEX ix_osm_poi_next_extent RENAME TO ix_osm_poi_extent")
            cur.execute("ALTER INDEX ix_osm_poi_next_tags RENAME TO ix_osm_poi_tags")
            cur.execute("DROP TABLE osm_poi_previous")

            cur.execute(
                """
                INSERT INTO osm_poi_snapshot
                    (id, built_at, source_name, source_timestamp, row_count, tag_pairs)
                VALUES (1, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    built_at = EXCLUDED.built_at,
                    source_name = EXCLUDED.source_name,
                    source_timestamp = EXCLUDED.source_timestamp,
                    row_count = EXCLUDED.row_count,
                    tag_pairs = EXCLUDED.tag_pairs
                """,
                (
                    built_at,
                    manifest["source_name"],
                    source_timestamp,
                    row_count,
                    json.dumps(manifest["tag_pairs"]),
                ),
            )

    return LoadResult(
        row_count=row_count,
        source_name=manifest["source_name"],
        source_timestamp=datetime.fromisoformat(source_timestamp),
    )
