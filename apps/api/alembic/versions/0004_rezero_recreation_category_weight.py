"""rezero recreation category weight

Recreation's default composite weightage moves from 3% to 0% (it's still
user-adjustable per-request via AnalyzeRequest.category_weights once a
recreation facility is activated in Settings). The other four categories
are proportionally rescaled from their prior 0.97 combined share back up
to 1.0, preserving their relative ratios.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-24
"""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

_NEW_WEIGHTS = {
    "education": 0.4124,
    "transport": 0.3093,
    "healthcare": 0.2062,
    "shopping": 0.0721,
    "recreation": 0.0000,
}
_OLD_WEIGHTS = {
    "education": 0.40,
    "transport": 0.30,
    "healthcare": 0.20,
    "shopping": 0.07,
    "recreation": 0.03,
}


def _apply(weights: dict[str, float]) -> None:
    category_weights_table = sa.table(
        "category_weights",
        sa.column("category", sa.Text()),
        sa.column("weight", sa.Float()),
    )
    for category, weight in weights.items():
        op.execute(
            category_weights_table.update()
            .where(category_weights_table.c.category == category)
            .values(weight=weight)
        )


def upgrade() -> None:
    _apply(_NEW_WEIGHTS)


def downgrade() -> None:
    _apply(_OLD_WEIGHTS)
