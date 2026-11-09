"""Read side of the local OSM POI snapshot (`osm_poi`, `osm_poi_snapshot`).

Writes never happen here: the snapshot is rebuilt wholesale by the loader in
`app/poi_snapshot/load.py`. See apps/api/docs/POI_SNAPSHOT.md.
"""

import json
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker


@dataclass(frozen=True)
class PoiSnapshotManifest:
    built_at: datetime
    source_name: str
    source_timestamp: datetime
    row_count: int
    tag_pairs: frozenset[tuple[str, str]]


# Matching uses the outline points (`extent`), like Overpass `around:`. The
# reported position is the bounding-box centre of `extent`, like Overpass
# `out center`. Elements come back in the Overpass shape, so
# `parse_category_elements` handles them with no second code path.
_FIND_NEAR_SQL = """
SELECT osm_type,
       osm_id,
       ST_Y(ST_Centroid(ST_Envelope(extent::geometry))) AS lat,
       ST_X(ST_Centroid(ST_Envelope(extent::geometry))) AS lon,
       tags::text AS tags
FROM osm_poi
WHERE ST_DWithin(
          extent,
          ST_SetSRID(ST_MakePoint(CAST(:lon AS float8), CAST(:lat AS float8)), 4326)::geography,
          CAST(:radius_m AS float8)
      )
  AND ({match})
"""


class PoiSnapshotRepository:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory

    async def load_manifest(self) -> PoiSnapshotManifest | None:
        """The snapshot manifest, or None when no snapshot has been loaded."""
        stmt = text(
            """
            SELECT built_at, source_name, source_timestamp, row_count, tag_pairs::text
            FROM osm_poi_snapshot
            WHERE id = 1
            """
        )
        async with self._session_factory() as session:
            row = (await session.execute(stmt)).first()
        if row is None:
            return None
        built_at, source_name, source_timestamp, row_count, tag_pairs = row
        return PoiSnapshotManifest(
            built_at=built_at,
            source_name=source_name,
            source_timestamp=source_timestamp,
            row_count=row_count,
            tag_pairs=frozenset((key, value) for key, value in json.loads(tag_pairs)),
        )

    async def find_elements_near(
        self,
        tag_pairs: list[tuple[str, str]],
        lat: float,
        lon: float,
        radius_m: float,
    ) -> list[dict]:
        """Overpass-shaped elements carrying any of `tag_pairs` within `radius_m`.

        Matches the semantics of the Overpass query built by
        `OverpassClient._build_merged_query`: a `nwr[key=value](around:r,lat,lon)`
        per pair, unioned. Each element appears once even if it matches several
        pairs.
        """
        if not tag_pairs:
            return []

        params: dict[str, object] = {"lat": lat, "lon": lon, "radius_m": radius_m}
        clauses = []
        for index, (key, value) in enumerate(tag_pairs):
            params[f"tag_{index}"] = json.dumps({key: value})
            clauses.append(f"tags @> CAST(:tag_{index} AS jsonb)")

        stmt = text(_FIND_NEAR_SQL.format(match=" OR ".join(clauses)))
        async with self._session_factory() as session:
            rows = (await session.execute(stmt, params)).all()

        elements = []
        for osm_type, osm_id, row_lat, row_lon, tags in rows:
            element: dict = {"type": osm_type, "id": osm_id, "tags": json.loads(tags)}
            if osm_type == "node":
                element["lat"] = row_lat
                element["lon"] = row_lon
            else:
                element["center"] = {"lat": row_lat, "lon": row_lon}
            elements.append(element)
        return elements
