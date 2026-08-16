"""create hazard tables (phase-0 scaffold)

Adds the H3-cell-based hazard schema: hazard_types (config, mirrors
facility_types), hazard_sources (provenance registry), hazard_cells (the H3
grid -- this repo's first Alembic-managed spatial column), and
hazard_cell_scores (per-hazard sub-score per cell). Seeds hazard_types with
the single "demo_hazard" scaffold entry from app/config/hazard_config.py --
real hazard types are added by a later migration once Phase 1 ingestion
lands (see apps/api/docs/HAZARD_SOURCES.md for which sources are actually
ingestible today).

Composite/worst-hazard scores are deliberately NOT stored on hazard_cells --
they're computed at request time from hazard_types.default_weight (see
app/services/hazard_scoring.py), mirroring how category_weights is already
blended live rather than precomputed, so a future user-adjustable weighting
UI never requires a backfill.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-16
"""

import sqlalchemy as sa

from alembic import op
from app.config.hazard_config import HAZARD_TYPE_CONFIGS

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hazard_types",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("default_weight", sa.Float(), nullable=False),
        sa.Column("severe_threshold", sa.Float(), nullable=False),
        sa.Column("is_proxy", sa.Boolean(), nullable=False),
        sa.Column("implemented", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint(
            "severe_threshold BETWEEN 0 AND 100", name="ck_severe_threshold_range"
        ),
    )

    op.create_table(
        "hazard_sources",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "hazard_type_slug", sa.Text(), sa.ForeignKey("hazard_types.slug"), nullable=False
        ),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column("licence", sa.Text(), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=True),
        sa.Column("attribution", sa.Text(), nullable=False),
        sa.Column("fetch_date", sa.Date(), nullable=False),
        sa.Column("data_currency_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # First spatial column managed by Alembic in this repo. PostGIS is
    # already enabled by docker/Dockerfile.postgis, and there's no
    # GeoAlchemy2 dependency here, so the geometry column and its index are
    # created via raw SQL rather than sa.Column -- matching how the
    # addresses table's own `shape` column is created outside Alembic
    # entirely, in docker/sql/03_post_load.sql.
    op.execute(
        """
        CREATE TABLE hazard_cells (
            h3_index TEXT PRIMARY KEY,
            resolution SMALLINT NOT NULL,
            geom GEOMETRY(Polygon, 4326) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_hazard_cells_geom ON hazard_cells USING GIST (geom)")

    op.create_table(
        "hazard_cell_scores",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "h3_index",
            sa.Text(),
            sa.ForeignKey("hazard_cells.h3_index", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "hazard_type_slug", sa.Text(), sa.ForeignKey("hazard_types.slug"), nullable=False
        ),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("severe", sa.Boolean(), nullable=False),
        sa.Column(
            "source_id", sa.BigInteger(), sa.ForeignKey("hazard_sources.id"), nullable=False
        ),
        sa.Column("data_currency_date", sa.Date(), nullable=False),
        sa.Column(
            "computed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("score BETWEEN 0 AND 100", name="ck_hazard_cell_score_range"),
        sa.UniqueConstraint("h3_index", "hazard_type_slug", name="uq_hazard_cell_type"),
    )
    op.create_index(
        "ix_hazard_cell_scores_hazard_type", "hazard_cell_scores", ["hazard_type_slug"]
    )

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
                "slug": slug,
                "label": cfg.label,
                "color": cfg.color,
                "description": cfg.description,
                "default_weight": cfg.default_weight,
                "severe_threshold": cfg.severe_threshold,
                "is_proxy": cfg.is_proxy,
                "implemented": cfg.implemented,
            }
            for slug, cfg in HAZARD_TYPE_CONFIGS.items()
        ],
    )


def downgrade() -> None:
    op.drop_table("hazard_cell_scores")
    op.execute("DROP TABLE hazard_cells")
    op.drop_table("hazard_sources")
    op.drop_table("hazard_types")
