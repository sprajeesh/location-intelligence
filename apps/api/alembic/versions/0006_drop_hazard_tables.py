"""drop hazard tables (feature removed)

Hazard scoring (PRs #90/#91/#92) has been removed as a half-baked, unused
feature. This drops the schema added by 0003_create_hazard_tables.py --
hazard_cell_scores, hazard_cells, hazard_sources, hazard_types -- in FK-safe
order, mirroring that migration's own downgrade(). 0003 itself is left in
place rather than edited/deleted so migration history stays a fixed record.

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-14
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("hazard_cell_scores")
    op.execute("DROP TABLE hazard_cells")
    op.drop_table("hazard_sources")
    op.drop_table("hazard_types")


def downgrade() -> None:
    raise NotImplementedError(
        "hazard scoring has been removed; recreating its schema is not supported"
    )
