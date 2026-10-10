from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for ORM models that map externally managed tables."""


class Address(Base):
    """Read-only mapping of the LINZ `addresses` table.

    The table is built into the postgis Docker image and is not managed by
    Alembic, so this model deliberately does not participate in migrations
    (`target_metadata` in alembic/env.py stays None). Only the columns the
    API reads are mapped; see docs/DATA_MODEL.md for the full table.
    """

    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_address: Mapped[str] = mapped_column(String(400))
    full_address_ascii: Mapped[str] = mapped_column(String(400))
    # Longitude / latitude, matching the `shape_x` / `shape_y` columns.
    shape_x: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
    shape_y: Mapped[Decimal | None] = mapped_column(Numeric(20, 8))
