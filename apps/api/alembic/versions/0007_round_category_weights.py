"""round default category weights

Simplifies the default composite-category weightage from the precise
proportional-rescale decimals introduced in 0004 (education 41.24%,
transport 30.93%, healthcare 20.62%, shopping 7.21%) down to simple round
numbers that are easier for users to reason about in Settings: education
40%, transport 30%, healthcare 20%, shopping 10%. Recreation and Food &
Drink remain at 0%. Still sums to 1.0.

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-14
"""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None

_NEW_WEIGHTS = {
    "education": 0.40,
    "transport": 0.30,
    "healthcare": 0.20,
    "shopping": 0.10,
}
_OLD_WEIGHTS = {
    "education": 0.4124,
    "transport": 0.3093,
    "healthcare": 0.2062,
    "shopping": 0.0721,
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
