"""seed coastal_elevation_proxy hazard type (phase-1 real ingestion)

Adds the first real (non-scaffold) hazard type: a low-elevation-near-coast
proxy derived from LINZ's public elevation data (s3://nz-elevation) and
coastline layer 124391 ("NZ Coastline - Mean High Water Springs Polygon"),
standing in for a national tsunami model per HAZARD.md's own suggested
approach where no such model is publicly available. Populated by
pipelines/hazard/coastal_elevation_proxy.py, not this migration -- this
only seeds the hazard_types config row, mirroring 0003's pattern of a
literal, hard-coded insert with no import of app/config/hazard_config.py so
migration history stays a fixed record independent of that module's future
edits. demo_hazard is left untouched; this is added alongside it.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-17
"""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    hazard_types_table = sa.table(
        "hazard_types",
        sa.column("slug", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("color", sa.Text()),
        sa.column("description", sa.Text()),
        sa.column("default_weight", sa.Float()),
        sa.column("severe_threshold", sa.Float()),
        sa.column("is_proxy", sa.Boolean()),
        sa.column("implemented", sa.Boolean()),
    )
    op.bulk_insert(
        hazard_types_table,
        [
            {
                "slug": "coastal_elevation_proxy",
                "label": "Coastal & Tsunami Exposure (proxy)",
                "color": "#2166ac",
                "description": (
                    "Illustrative proxy combining ground elevation and distance to "
                    "the coastline: low-lying land close to the sea scores higher. "
                    "Stands in for a real national tsunami hazard model, which does "
                    "not currently exist as a public bulk dataset (see "
                    "apps/api/docs/HAZARD_SOURCES.md). Not a tsunami inundation "
                    "prediction."
                ),
                "default_weight": 1.0,
                "severe_threshold": 70.0,
                "is_proxy": True,
                "implemented": True,
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM hazard_types WHERE slug = 'coastal_elevation_proxy'")
