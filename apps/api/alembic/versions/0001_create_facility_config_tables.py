"""create facility config tables

Seeds facility_types / category_weights with the exact values previously
hardcoded across app/config/scoring_config.py, app/api/categories.py,
app/clients/overpass.py, and app/services/scoring.py -- a mechanical
transcription, not new data.

Revision ID: 0001
Revises:
Create Date: 2026-07-31
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.config.scoring_config import CATEGORY_WEIGHTS, FACILITY_CONFIGS

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "category_weights",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("category", sa.Text(), nullable=False, unique=True),
        sa.Column("weight", sa.Float(), nullable=False),
    )

    op.create_table(
        "facility_types",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("singular_label", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("implemented", sa.Boolean(), nullable=False),
        sa.Column(
            "composite_category",
            sa.Text(),
            sa.ForeignKey("category_weights.category"),
            nullable=False,
        ),
        sa.Column("category_weight", sa.Float(), nullable=False),
        sa.Column("distance_mode", sa.Text(), nullable=False),
        sa.Column("decay_constant", sa.Float(), nullable=False),
        sa.Column("reference_radius", sa.Float(), nullable=False),
        sa.Column("hard_cutoff", sa.Float(), nullable=False),
        sa.Column("saturation_point", sa.Float(), nullable=False),
        sa.Column("proximity_weight", sa.Float(), nullable=False),
        sa.Column("density_weight", sa.Float(), nullable=False),
        sa.Column("count_ceiling", sa.Float(), nullable=True),
        sa.Column("drive_decay_constant", sa.Float(), nullable=True),
        sa.Column("drive_reference_radius", sa.Float(), nullable=True),
        sa.Column("drive_hard_cutoff", sa.Float(), nullable=True),
        sa.Column("osm_tags", postgresql.JSONB(), nullable=False),
        sa.CheckConstraint(
            "hard_cutoff > reference_radius",
            name="ck_hard_cutoff_exceeds_reference_radius",
        ),
        sa.CheckConstraint(
            "(drive_decay_constant IS NULL AND drive_reference_radius IS NULL "
            "AND drive_hard_cutoff IS NULL) "
            "OR (drive_decay_constant IS NOT NULL AND drive_reference_radius IS NOT NULL "
            "AND drive_hard_cutoff IS NOT NULL)",
            name="ck_drive_fields_all_or_nothing",
        ),
        sa.CheckConstraint(
            "drive_hard_cutoff IS NULL OR drive_reference_radius IS NULL "
            "OR drive_hard_cutoff > drive_reference_radius",
            name="ck_drive_hard_cutoff_exceeds_drive_reference_radius",
        ),
    )

    category_weights_table = sa.table(
        "category_weights",
        sa.column("category", sa.Text()),
        sa.column("weight", sa.Float()),
    )
    op.bulk_insert(
        category_weights_table,
        [{"category": category, "weight": weight} for category, weight in CATEGORY_WEIGHTS.items()],
    )

    facility_types_table = sa.table(
        "facility_types",
        sa.column("slug", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("singular_label", sa.Text()),
        sa.column("color", sa.Text()),
        sa.column("implemented", sa.Boolean()),
        sa.column("composite_category", sa.Text()),
        sa.column("category_weight", sa.Float()),
        sa.column("distance_mode", sa.Text()),
        sa.column("decay_constant", sa.Float()),
        sa.column("reference_radius", sa.Float()),
        sa.column("hard_cutoff", sa.Float()),
        sa.column("saturation_point", sa.Float()),
        sa.column("proximity_weight", sa.Float()),
        sa.column("density_weight", sa.Float()),
        sa.column("count_ceiling", sa.Float()),
        sa.column("drive_decay_constant", sa.Float()),
        sa.column("drive_reference_radius", sa.Float()),
        sa.column("drive_hard_cutoff", sa.Float()),
        sa.column("osm_tags", postgresql.JSONB()),
    )
    op.bulk_insert(
        facility_types_table,
        [
            {
                "slug": slug,
                "label": cfg.label,
                "singular_label": cfg.singular_label,
                "color": cfg.color,
                "implemented": cfg.implemented,
                "composite_category": cfg.composite_category,
                "category_weight": cfg.category_weight,
                "distance_mode": cfg.distance_mode,
                "decay_constant": cfg.decay_constant,
                "reference_radius": cfg.reference_radius,
                "hard_cutoff": cfg.hard_cutoff,
                "saturation_point": cfg.saturation_point,
                "proximity_weight": cfg.proximity_weight,
                "density_weight": cfg.density_weight,
                "count_ceiling": cfg.count_ceiling,
                "drive_decay_constant": cfg.drive_decay_constant,
                "drive_reference_radius": cfg.drive_reference_radius,
                "drive_hard_cutoff": cfg.drive_hard_cutoff,
                "osm_tags": [list(pair) for pair in cfg.osm_tags],
            }
            for slug, cfg in FACILITY_CONFIGS.items()
        ],
    )


def downgrade() -> None:
    op.drop_table("facility_types")
    op.drop_table("category_weights")
