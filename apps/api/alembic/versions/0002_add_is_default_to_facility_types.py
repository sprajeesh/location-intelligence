"""add is_default to facility_types

Marks which facility types make up the "default facility set" used by
POST /location/analyze when the request omits `categories` entirely. The
DB-driven flag (vs. a hardcoded list) means it can be changed without a
redeploy, and doubles as the pre-checked state for a future UI settings
screen.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-06
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# education, healthcare, transport x2, shopping -- recreation deliberately
# excluded from the default set.
_DEFAULT_SLUGS = ("schools", "gps", "bus_stops", "railway_stations", "supermarkets")


def upgrade() -> None:
    op.add_column(
        "facility_types",
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    facility_types_table = sa.table(
        "facility_types",
        sa.column("slug", sa.Text()),
        sa.column("is_default", sa.Boolean()),
    )
    op.execute(
        facility_types_table.update()
        .where(facility_types_table.c.slug.in_(_DEFAULT_SLUGS))
        .values(is_default=True)
    )


def downgrade() -> None:
    op.drop_column("facility_types", "is_default")
