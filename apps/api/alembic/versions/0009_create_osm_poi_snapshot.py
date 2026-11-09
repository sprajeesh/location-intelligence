"""create osm_poi snapshot tables

Local copy of the OpenStreetMap points of interest that the facility search
needs, so the request path no longer depends on the public Overpass API for
those categories. See apps/api/docs/POI_SNAPSHOT.md.

- `osm_poi`: one row per OSM element (node, way or relation) that carries at
  least one tag from the facility catalogue. `extent` holds every outline point
  (a node is a single point). Radius matching uses `extent`, the same as the
  Overpass `around:` filter, which matches a way when any of its nodes is in
  range. The reported position is the bounding-box centre of `extent`, as
  Overpass `out center` returns it. `tags`
  keeps only the keys the API reads (the matched keys, names and the detail
  tags), so a row parses exactly like an Overpass element.
- `osm_poi_snapshot`: a single-row manifest recording when the snapshot was
  built, from which extract, and which (key, value) pairs it covers. The API
  only serves a category from the snapshot when every one of its pairs is
  listed here. No row means no snapshot, and everything falls back to Overpass.

The table is rebuilt wholesale by `python -m app.poi_snapshot load` (a
staging-table swap), never edited row by row, so there is no id column and no
primary key; `(osm_type, osm_id)` is enforced by a unique index instead.

`extent` is created via raw SQL, matching 0003 and 0008. Points are stored
longitude-first (x = lon, y = lat).

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-09
"""

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE osm_poi (
            osm_type TEXT NOT NULL,
            osm_id BIGINT NOT NULL,
            extent GEOGRAPHY(MultiPoint, 4326) NOT NULL,
            tags JSONB NOT NULL,
            CONSTRAINT ck_osm_poi_type CHECK (osm_type IN ('node', 'way', 'relation'))
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX ux_osm_poi_element ON osm_poi (osm_type, osm_id)")
    op.execute("CREATE INDEX ix_osm_poi_extent ON osm_poi USING GIST (extent)")
    # jsonb_path_ops is the compact GIN opclass; it only supports the @> containment
    # operator, which is the only way the repository matches tags.
    op.execute("CREATE INDEX ix_osm_poi_tags ON osm_poi USING GIN (tags jsonb_path_ops)")

    op.execute(
        """
        CREATE TABLE osm_poi_snapshot (
            id SMALLINT PRIMARY KEY DEFAULT 1,
            built_at TIMESTAMPTZ NOT NULL,
            source_name TEXT NOT NULL,
            source_timestamp TIMESTAMPTZ NOT NULL,
            row_count BIGINT NOT NULL,
            tag_pairs JSONB NOT NULL,
            CONSTRAINT ck_osm_poi_snapshot_singleton CHECK (id = 1)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS osm_poi_snapshot")
    op.execute("DROP TABLE IF EXISTS osm_poi")
