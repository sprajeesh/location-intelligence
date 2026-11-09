"""CLI for the POI snapshot pipeline.

    python -m app.poi_snapshot build --pbf new-zealand-latest.osm.pbf --out-dir out/
    python -m app.poi_snapshot load --dir out/

`build` needs the dev dependencies (pyosmium). `load` needs DATABASE_URL and the
migration that creates `osm_poi` (0009) applied.
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

from app.poi_snapshot.load import load_snapshot

logger = logging.getLogger("poi_snapshot")


def _build(args: argparse.Namespace) -> int:
    # Imported here, not at module level: pyosmium is a dev dependency and the
    # `load` command must run in the production image without it.
    from app.poi_snapshot.extract import (
        ExtractStats,
        extract_rows,
        read_source_timestamp,
        snapshot_tag_pairs,
        write_extract,
    )

    tag_pairs = snapshot_tag_pairs()
    source_timestamp = (
        datetime.fromisoformat(args.source_timestamp)
        if args.source_timestamp
        else read_source_timestamp(args.pbf)
    )
    stats = ExtractStats()
    manifest = write_extract(
        extract_rows(args.pbf, tag_pairs, stats),
        args.out_dir,
        source_name=args.source_name,
        source_timestamp=source_timestamp,
        tag_pairs=tag_pairs,
    )
    print(
        f"Wrote {manifest['row_count']} rows to {args.out_dir} "
        f"(source {manifest['source_name']} @ {manifest['source_timestamp']}; "
        f"facility relations skipped (no geometry): {stats.relations_without_geometry}; "
        f"ways missing node locations skipped: {stats.ways_missing_locations})"
    )
    return 0


def _load(args: argparse.Namespace) -> int:
    from app.config.settings import get_settings

    database_url = args.database_url or get_settings().database_url
    result = load_snapshot(database_url, Path(args.dir))
    print(
        f"Loaded {result.row_count} rows from {result.source_name} "
        f"(source timestamp {result.source_timestamp.isoformat()})"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(prog="python -m app.poi_snapshot")
    sub = parser.add_subparsers(dest="command", required=True)

    build = sub.add_parser("build", help="Extract facility POIs from an OSM PBF file")
    build.add_argument("--pbf", required=True, help="Path to the OSM PBF extract")
    build.add_argument("--out-dir", required=True, help="Directory for the snapshot files")
    build.add_argument("--source-name", default="geofabrik-new-zealand")
    build.add_argument(
        "--source-timestamp",
        help="ISO 8601 timestamp of the extract. Defaults to the PBF header.",
    )
    build.set_defaults(func=_build)

    load = sub.add_parser("load", help="Load a built snapshot into PostGIS")
    load.add_argument("--dir", required=True, help="Directory produced by `build`")
    load.add_argument("--database-url", help="Defaults to DATABASE_URL from settings")
    load.set_defaults(func=_load)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
