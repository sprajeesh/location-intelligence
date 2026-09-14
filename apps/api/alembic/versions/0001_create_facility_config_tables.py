"""create facility config tables

Seeds facility_types / category_weights with the exact values previously
hardcoded across app/config/scoring_config.py, app/api/categories.py,
app/clients/overpass.py, and app/services/scoring.py -- a mechanical
transcription, not new data.

This revision deliberately does not import app/config/scoring_config.py --
it originally did, but that module is live code that later migrations
(0004, 0005) apply deltas on top of. Importing it here meant a fresh
`alembic upgrade head` on an empty database would seed 0001 with
today's config (already including 0005's "food_and_drink" category) and
then crash when 0005 tried to insert it again. The two dicts below are a
frozen snapshot of what CATEGORY_WEIGHTS/FACILITY_CONFIGS looked like at
this revision's original Create Date, before 0004's reweighting and
0005's new category/facility types existed -- migration history stays a
fixed record, same rationale as 0003/0006's own hazard tables.

Revision ID: 0001
Revises:
Create Date: 2026-07-31
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Frozen as of this revision's Create Date -- see the module docstring.
# Values match app/config/scoring_config.py's CATEGORY_WEIGHTS/FACILITY_CONFIGS
# minus what 0004 (reweighting) and 0005 (food_and_drink) each add later.
_CATEGORY_WEIGHTS: dict[str, float] = {
    "education": 0.40,
    "transport": 0.30,
    "healthcare": 0.20,
    "shopping": 0.07,
    "recreation": 0.03,
}

_FACILITY_CONFIGS: dict[str, dict] = {
    "schools": {
        "distance_mode": "walk",
        "decay_constant": 0.4,
        "reference_radius": 1.0,
        "hard_cutoff": 3.0,
        "saturation_point": 3,
        "proximity_weight": 0.5,
        "density_weight": 0.5,
        "count_ceiling": None,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Schools",
        "singular_label": "school",
        "color": "#F59E0B",
        "implemented": True,
        "composite_category": "education",
        "category_weight": 0.55,
        "osm_tags": [("amenity", "school")],
    },
    "kindergartens": {
        "distance_mode": "walk",
        "decay_constant": 0.4,
        "reference_radius": 1.0,
        "hard_cutoff": 3.0,
        "saturation_point": 2,
        "proximity_weight": 0.6,
        "density_weight": 0.4,
        "count_ceiling": 2,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Kindergartens",
        "singular_label": "kindergarten",
        "color": "#FB923C",
        "implemented": True,
        "composite_category": "education",
        "category_weight": 0.20,
        "osm_tags": [("amenity", "kindergarten")],
    },
    "universities": {
        "distance_mode": "drive",
        "decay_constant": 5,
        "reference_radius": 10,
        "hard_cutoff": 25,
        "saturation_point": 1,
        "proximity_weight": 0.85,
        "density_weight": 0.15,
        "count_ceiling": 1,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Universities",
        "singular_label": "university",
        "color": "#8B5CF6",
        "implemented": True,
        "composite_category": "education",
        "category_weight": 0.25,
        "osm_tags": [("amenity", "university")],
    },
    "libraries": {
        "distance_mode": "drive",
        "decay_constant": 2,
        "reference_radius": 4,
        "hard_cutoff": 12,
        "saturation_point": 1,
        "proximity_weight": 0.7,
        "density_weight": 0.3,
        "count_ceiling": 2,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Libraries",
        "singular_label": "library",
        "color": "#3B82F6",
        "implemented": True,
        "composite_category": "recreation",
        "category_weight": 0.40,
        "osm_tags": [("amenity", "library")],
    },
    "parks": {
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
        "label": "Parks",
        "singular_label": "park",
        "color": "#22C55E",
        "implemented": True,
        "composite_category": "recreation",
        "category_weight": 0.40,
        "osm_tags": [("leisure", "park")],
    },
    "playgrounds": {
        "distance_mode": "walk",
        "decay_constant": 0.25,
        "reference_radius": 0.5,
        "hard_cutoff": 1.5,
        "saturation_point": 2,
        "proximity_weight": 0.55,
        "density_weight": 0.45,
        "count_ceiling": None,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Playgrounds",
        "singular_label": "playground",
        "color": "#A3E635",
        "implemented": True,
        "composite_category": "recreation",
        "category_weight": 0.20,
        "osm_tags": [("leisure", "playground")],
    },
    "bus_stops": {
        "distance_mode": "walk",
        "decay_constant": 0.2,
        "reference_radius": 0.45,
        "hard_cutoff": 1.2,
        "saturation_point": 3,
        "proximity_weight": 0.4,
        "density_weight": 0.6,
        "count_ceiling": None,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Bus Stops",
        "singular_label": "bus stop",
        "color": "#14B8A6",
        "implemented": True,
        "composite_category": "transport",
        "category_weight": 0.45,
        "osm_tags": [("highway", "bus_stop"), ("public_transport", "platform")],
    },
    "railway_stations": {
        "distance_mode": "best_of_both",
        "decay_constant": 0.5,
        "reference_radius": 1.0,
        "hard_cutoff": 3.0,
        "drive_decay_constant": 3,
        "drive_reference_radius": 5,
        "drive_hard_cutoff": 15,
        "saturation_point": 2,
        "proximity_weight": 0.65,
        "density_weight": 0.35,
        "count_ceiling": 3,
        "label": "Railway Stations",
        "singular_label": "railway station",
        "color": "#0EA5E9",
        "implemented": True,
        "composite_category": "transport",
        "category_weight": 0.55,
        "osm_tags": [("railway", "station")],
    },
    "hospitals": {
        "distance_mode": "drive",
        "decay_constant": 4,
        "reference_radius": 5,
        "hard_cutoff": 15,
        "saturation_point": 1,
        "proximity_weight": 0.85,
        "density_weight": 0.15,
        "count_ceiling": 2,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Hospitals",
        "singular_label": "hospital",
        "color": "#EF4444",
        "implemented": True,
        "composite_category": "healthcare",
        "category_weight": 0.35,
        "osm_tags": [("amenity", "hospital"), ("healthcare", "hospital")],
    },
    "gps": {
        "distance_mode": "drive",
        "decay_constant": 2,
        "reference_radius": 2.5,
        "hard_cutoff": 9,
        "saturation_point": 2,
        "proximity_weight": 0.6,
        "density_weight": 0.4,
        "count_ceiling": 2,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "GPs",
        "singular_label": "GP",
        "color": "#F97316",
        "implemented": True,
        "composite_category": "healthcare",
        "category_weight": 0.45,
        "osm_tags": [
            ("amenity", "doctors"),
            ("amenity", "clinic"),
            ("healthcare", "doctor"),
            ("healthcare", "clinic"),
        ],
    },
    "pharmacies": {
        "distance_mode": "drive",
        "decay_constant": 1.5,
        "reference_radius": 2,
        "hard_cutoff": 8,
        "saturation_point": 2,
        "proximity_weight": 0.65,
        "density_weight": 0.35,
        "count_ceiling": 2,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Pharmacies",
        "singular_label": "pharmacy",
        "color": "#EC4899",
        "implemented": True,
        "composite_category": "healthcare",
        "category_weight": 0.20,
        "osm_tags": [("amenity", "pharmacy")],
    },
    "supermarkets": {
        "distance_mode": "drive",
        "decay_constant": 2,
        "reference_radius": 3,
        "hard_cutoff": 10,
        "saturation_point": 2,
        "proximity_weight": 0.6,
        "density_weight": 0.4,
        "count_ceiling": 3,
        "drive_decay_constant": None,
        "drive_reference_radius": None,
        "drive_hard_cutoff": None,
        "label": "Supermarkets",
        "singular_label": "supermarket",
        "color": "#10B981",
        "implemented": True,
        "composite_category": "shopping",
        "category_weight": 1.0,
        "osm_tags": [("shop", "supermarket")],
    },
}


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
        [
            {"category": category, "weight": weight}
            for category, weight in _CATEGORY_WEIGHTS.items()
        ],
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
                "label": cfg["label"],
                "singular_label": cfg["singular_label"],
                "color": cfg["color"],
                "implemented": cfg["implemented"],
                "composite_category": cfg["composite_category"],
                "category_weight": cfg["category_weight"],
                "distance_mode": cfg["distance_mode"],
                "decay_constant": cfg["decay_constant"],
                "reference_radius": cfg["reference_radius"],
                "hard_cutoff": cfg["hard_cutoff"],
                "saturation_point": cfg["saturation_point"],
                "proximity_weight": cfg["proximity_weight"],
                "density_weight": cfg["density_weight"],
                "count_ceiling": cfg["count_ceiling"],
                "drive_decay_constant": cfg["drive_decay_constant"],
                "drive_reference_radius": cfg["drive_reference_radius"],
                "drive_hard_cutoff": cfg["drive_hard_cutoff"],
                "osm_tags": [list(pair) for pair in cfg["osm_tags"]],
            }
            for slug, cfg in _FACILITY_CONFIGS.items()
        ],
    )


def downgrade() -> None:
    op.drop_table("facility_types")
    op.drop_table("category_weights")
