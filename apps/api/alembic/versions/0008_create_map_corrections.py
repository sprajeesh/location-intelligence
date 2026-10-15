"""create map_corrections table

Stores user-submitted Map corrections: `add` requests (a facility missing from
OpenStreetMap) and `remove` requests (an existing OSM facility that is closed
or wrong). This revision creates the schema only; the endpoint and review
flow come later.

The per-type rules (which columns are required and which must be NULL) are
enforced as CHECK constraints so that a malformed row cannot be written even
by code that bypasses the repository.

`geom` is created via raw SQL, matching 0003: GEOGRAPHY is not expressible
through sa.Column without GeoAlchemy2. Points are stored longitude-first
(ST_MakePoint(lon, lat)), like every other geometry in this repo.

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-15
"""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE map_corrections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            correction_type TEXT NOT NULL,
            facility_type_slug TEXT NOT NULL REFERENCES facility_types(slug),
            target_osm_id TEXT,
            name TEXT,
            address TEXT,
            reason TEXT,
            geom GEOGRAPHY(Point, 4326) NOT NULL,
            reporter_email TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            report_count INT NOT NULL DEFAULT 1,
            dedupe_checked BOOLEAN NOT NULL DEFAULT true,
            review_note TEXT,
            osm_element_id TEXT,
            client_ip_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            reviewed_at TIMESTAMPTZ,
            CONSTRAINT ck_map_corrections_type
                CHECK (correction_type IN ('add', 'remove')),
            CONSTRAINT ck_map_corrections_status
                CHECK (status IN ('pending', 'rejected', 'applied')),
            CONSTRAINT ck_map_corrections_reason
                CHECK (reason IN ('closed', 'not_found', 'other')),
            CONSTRAINT ck_map_corrections_name_length
                CHECK (char_length(name) <= 200),
            CONSTRAINT ck_map_corrections_address_length
                CHECK (char_length(address) <= 300),
            CONSTRAINT ck_map_corrections_email_length
                CHECK (char_length(reporter_email) <= 254),
            CONSTRAINT ck_map_corrections_report_count
                CHECK (report_count >= 1),
            CONSTRAINT ck_map_corrections_add_fields
                CHECK (
                    correction_type <> 'add'
                    OR (target_osm_id IS NULL AND reason IS NULL)
                ),
            CONSTRAINT ck_map_corrections_remove_fields
                CHECK (
                    correction_type <> 'remove'
                    OR (
                        target_osm_id IS NOT NULL
                        AND reason IS NOT NULL
                        AND name IS NULL
                        AND address IS NULL
                    )
                )
        )
        """
    )
    op.execute("CREATE INDEX ix_map_corrections_geom ON map_corrections USING GIST (geom)")
    op.execute("CREATE INDEX ix_map_corrections_status ON map_corrections (status)")
    op.execute(
        "CREATE INDEX ix_map_corrections_type_target "
        "ON map_corrections (correction_type, target_osm_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE map_corrections")
