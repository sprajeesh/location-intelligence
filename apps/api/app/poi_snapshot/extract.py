"""Build the OSM POI snapshot extract from an OpenStreetMap PBF file.

Pass 1 (`extract_rows`) streams the PBF once with pyosmium and emits one row per
element that carries a facility tag pair. Geometry follows Overpass `out center`:
a node is its own point, and a way or multipolygon relation is the centre of its
bounding box. Closed ways come back from pyosmium both as a Way and as an Area,
so rows are deduplicated on (type, id).

Pass 2 (`write_extract`) writes the rows as gzipped NDJSON plus a manifest, which
`app.poi_snapshot.load` turns into the `osm_poi` table.

This module imports pyosmium, which is a dev dependency, so the API process never
imports it. Only the build CLI and the tests do.
"""

import gzip
import json
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import osmium

from app.clients.overpass import tags_to_keep
from app.config.scoring_config import FACILITY_CONFIGS
from app.poi_snapshot.files import MANIFEST_FILENAME, ROWS_FILENAME


@dataclass(frozen=True)
class PoiRow:
    """One facility element. `points` are its outline as (lon, lat) pairs: a node
    has one, a way has its nodes, a multipolygon has its outer-ring nodes."""

    osm_type: str  # "node" | "way" | "relation"
    osm_id: int
    points: tuple[tuple[float, float], ...]
    tags: dict[str, str]


@dataclass
class ExtractStats:
    """Counts for the build log. `relations_without_geometry` are facility relations
    with no multipolygon outline and no resolvable member geometry, so they cannot
    be placed. Site relations (e.g. a school campus) are resolved from their members
    and are not counted here."""

    rows: int = 0
    relations_without_geometry: int = 0
    ways_missing_locations: int = 0


@dataclass
class _RelationCandidate:
    tags: dict[str, str]
    node_members: list[int]
    way_members: list[int]


def snapshot_tag_pairs() -> list[tuple[str, str]]:
    """Every (key, value) pair any facility category asks for, sorted.

    Derived from FACILITY_CONFIGS, the same source the Overpass path uses, so the
    snapshot cannot drift from the code's category definitions for the pairs it
    knows about. Runtime coverage is still checked against the manifest, so a
    database-only facility type is served by Overpass rather than silently missed.
    """
    pairs: set[tuple[str, str]] = set()
    for config in FACILITY_CONFIGS.values():
        pairs.update(config.osm_tags)
    return sorted(pairs)


def _unique(points: list[tuple[float, float]]) -> tuple[tuple[float, float], ...]:
    """Drop repeated points (a closed ring repeats its first node), keeping order."""
    return tuple(dict.fromkeys(points))


def _matching_tags(
    raw_tags: Iterable[tuple[str, str]],
    pair_set: frozenset[tuple[str, str]],
    keep: frozenset[str],
) -> dict[str, str] | None:
    """The kept tags of an element, or None when it matches no facility pair."""
    tags = dict(raw_tags)
    if not any(pair in pair_set for pair in tags.items()):
        return None
    return {key: value for key, value in tags.items() if key in keep}


def extract_rows(
    pbf_path: str | Path,
    tag_pairs: list[tuple[str, str]],
    stats: ExtractStats | None = None,
) -> Iterator[PoiRow]:
    """Yield one PoiRow per OSM element matching any of `tag_pairs`."""
    stats = stats if stats is not None else ExtractStats()
    pair_set = frozenset(tag_pairs)
    keep = frozenset(tags_to_keep(tag_pairs))
    tag_filter = osmium.filter.TagFilter(*tag_pairs)

    processor = (
        osmium.FileProcessor(str(pbf_path), osmium.osm.NODE | osmium.osm.WAY | osmium.osm.RELATION)
        .with_areas(tag_filter)
        .with_filter(tag_filter)
        .with_locations()
    )

    seen: set[tuple[str, int]] = set()
    relation_candidates: dict[int, _RelationCandidate] = {}
    for obj in processor:
        if obj.is_node():
            if not obj.location.valid():
                continue
            key = ("node", obj.id)
            tags = _matching_tags(obj.tags, pair_set, keep)
            if tags is None or key in seen:
                continue
            seen.add(key)
            stats.rows += 1
            yield PoiRow("node", obj.id, ((obj.location.lon, obj.location.lat),), tags)

        elif obj.is_way():
            key = ("way", obj.id)
            tags = _matching_tags(obj.tags, pair_set, keep)
            if tags is None or key in seen:
                continue
            points = [(n.location.lon, n.location.lat) for n in obj.nodes if n.location.valid()]
            if len(points) != len(obj.nodes) or not points:
                stats.ways_missing_locations += 1
                continue
            seen.add(key)
            stats.rows += 1
            yield PoiRow("way", obj.id, _unique(points), tags)

        elif obj.is_area():
            # Closed ways and multipolygon relations, as areas.
            osm_type = "way" if obj.from_way() else "relation"
            osm_id = obj.orig_id()
            key = (osm_type, osm_id)
            tags = _matching_tags(obj.tags, pair_set, keep)
            if tags is None or key in seen:
                continue
            points = [(n.lon, n.lat) for ring in obj.outer_rings() for n in ring]
            if not points:
                stats.ways_missing_locations += 1
                continue
            seen.add(key)
            stats.rows += 1
            yield PoiRow(osm_type, osm_id, _unique(points), tags)

        elif obj.is_relation():
            # A relation has no geometry of its own. A multipolygon's outline arrives
            # as an Area above. Anything else is resolved from its members below.
            tags = _matching_tags(obj.tags, pair_set, keep)
            if tags is not None:
                members = list(obj.members)
                relation_candidates[obj.id] = _RelationCandidate(
                    tags=tags,
                    node_members=[m.ref for m in members if m.type == "n"],
                    way_members=[m.ref for m in members if m.type == "w"],
                )

    pending = {rid: c for rid, c in relation_candidates.items() if ("relation", rid) not in seen}
    if not pending:
        return
    node_ids = {n for c in pending.values() for n in c.node_members}
    way_ids = {w for c in pending.values() for w in c.way_members}
    node_coords, way_points = _member_points(pbf_path, node_ids, way_ids)
    for rid, candidate in pending.items():
        points = [node_coords[n] for n in candidate.node_members if n in node_coords]
        for way_id in candidate.way_members:
            points.extend(way_points.get(way_id, []))
        if not points:
            stats.relations_without_geometry += 1
            continue
        stats.rows += 1
        yield PoiRow("relation", rid, _unique(points), candidate.tags)


def _member_points(
    pbf_path: str | Path, node_ids: set[int], way_ids: set[int]
) -> tuple[dict[int, tuple[float, float]], dict[int, list[tuple[float, float]]]]:
    """(lon, lat) for the requested member nodes, and outline points for member ways.

    A second pass over the file, run only when a site relation needs resolving. The
    node-location cache is filled by the same pass, so ways can read their nodes.
    """
    if not node_ids and not way_ids:
        return {}, {}
    coords: dict[int, tuple[float, float]] = {}
    ways: dict[int, list[tuple[float, float]]] = {}
    processor = osmium.FileProcessor(
        str(pbf_path), osmium.osm.NODE | osmium.osm.WAY
    ).with_locations()
    for obj in processor:
        if obj.is_node():
            if obj.id in node_ids and obj.location.valid():
                coords[obj.id] = (obj.location.lon, obj.location.lat)
        elif obj.is_way() and obj.id in way_ids:
            ways[obj.id] = [
                (n.location.lon, n.location.lat) for n in obj.nodes if n.location.valid()
            ]
    return coords, ways


def read_source_timestamp(pbf_path: str | Path) -> datetime:
    """The OSM replication timestamp recorded in the PBF header (UTC)."""
    header = osmium.io.Reader(str(pbf_path)).header()
    raw = header.get("osmosis_replication_timestamp")
    if not raw:
        raise ValueError(
            f"{pbf_path} has no osmosis_replication_timestamp header; "
            "pass --source-timestamp explicitly"
        )
    return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(UTC)


def write_extract(
    rows: Iterable[PoiRow],
    out_dir: str | Path,
    *,
    source_name: str,
    source_timestamp: datetime,
    tag_pairs: list[tuple[str, str]],
    built_at: datetime | None = None,
) -> dict:
    """Write the rows and manifest into `out_dir`. Returns the manifest dict."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    row_count = 0
    with gzip.open(out / ROWS_FILENAME, "wt", encoding="utf-8") as fh:
        for row in rows:
            fh.write(
                json.dumps(
                    {
                        "t": row.osm_type,
                        "i": row.osm_id,
                        "pts": [[x, y] for x, y in row.points],
                        "tags": row.tags,
                    },
                    separators=(",", ":"),
                )
                + "\n"
            )
            row_count += 1

    manifest = {
        "built_at": (built_at or datetime.now(UTC)).isoformat(),
        "source_name": source_name,
        "source_timestamp": source_timestamp.isoformat(),
        "row_count": row_count,
        "tag_pairs": [list(pair) for pair in tag_pairs],
    }
    (out / MANIFEST_FILENAME).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest
