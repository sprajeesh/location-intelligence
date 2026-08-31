"""add food_and_drink category with restaurants and pubs_bars facility types

Create a new Food & Drink composite category (default weight 0%, matching
Recreation's zero-by-default policy) with two facility types: restaurants
(weight 0.6, walk-based) and pubs_bars (weight 0.4, walk-based). Both are
opt-in, not included in the default facility set.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-31
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    category_weights_table = sa.table(
        "category_weights",
        sa.column("category", sa.Text()),
        sa.column("weight", sa.Float()),
    )
    op.bulk_insert(
        category_weights_table,
        [{"category": "food_and_drink", "weight": 0.0}],
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
        sa.column("is_default", sa.Boolean()),
    )
    op.bulk_insert(
        facility_types_table,
        [
            {
                "slug": "restaurants",
                "label": "Restaurants",
                "singular_label": "restaurant",
                "color": "#D97706",
                "implemented": True,
                "composite_category": "food_and_drink",
                "category_weight": 0.6,
                "distance_mode": "drive",
                "decay_constant": 2,
                "reference_radius": 3.5,
                "hard_cutoff": 12,
                "saturation_point": 2,
                "proximity_weight": 0.6,
                "density_weight": 0.4,
                "count_ceiling": None,
                "drive_decay_constant": None,
                "drive_reference_radius": None,
                "drive_hard_cutoff": None,
                "osm_tags": [["amenity", "restaurant"]],
                "is_default": False,
            },
            {
                "slug": "pubs_bars",
                "label": "Pubs & Bars",
                "singular_label": "pub or bar",
                "color": "#6366F1",
                "implemented": True,
                "composite_category": "food_and_drink",
                "category_weight": 0.4,
                "distance_mode": "walk",
                "decay_constant": 0.35,
                "reference_radius": 0.8,
                "hard_cutoff": 2.5,
                "saturation_point": 2,
                "proximity_weight": 0.6,
                "density_weight": 0.4,
                "count_ceiling": None,
                "drive_decay_constant": None,
                "drive_reference_radius": None,
                "drive_hard_cutoff": None,
                "osm_tags": [["amenity", "pub"], ["amenity", "bar"]],
                "is_default": False,
            },
        ],
    )


def downgrade() -> None:
    facility_types_table = sa.table(
        "facility_types",
        sa.column("slug", sa.Text()),
    )
    op.execute(
        facility_types_table.delete().where(
            facility_types_table.c.slug.in_(["restaurants", "pubs_bars"])
        )
    )

    category_weights_table = sa.table(
        "category_weights",
        sa.column("category", sa.Text()),
    )
    op.execute(
        category_weights_table.delete().where(category_weights_table.c.category == "food_and_drink")
    )
