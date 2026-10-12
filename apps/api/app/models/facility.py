from sqlalchemy import BigInteger, Boolean, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CategoryWeight(Base):
    """Read-only mapping of the `category_weights` table, managed by Alembic.

    Only the columns the API reads are mapped; see docs/DATA_MODEL.md.
    """

    __tablename__ = "category_weights"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    category: Mapped[str] = mapped_column(Text)
    weight: Mapped[float] = mapped_column(Float)


class FacilityType(Base):
    """Read-only mapping of the `facility_types` table, managed by Alembic.

    `slug` is the business key the rest of the app uses. `osm_tags` is a JSON
    array of [key, value] pairs. Only the columns the API reads are mapped; see
    docs/DATA_MODEL.md for the full table.
    """

    __tablename__ = "facility_types"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    slug: Mapped[str] = mapped_column(Text)
    label: Mapped[str] = mapped_column(Text)
    singular_label: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(Text)
    implemented: Mapped[bool] = mapped_column(Boolean)
    composite_category: Mapped[str] = mapped_column(Text)
    category_weight: Mapped[float] = mapped_column(Float)
    distance_mode: Mapped[str] = mapped_column(Text)
    decay_constant: Mapped[float] = mapped_column(Float)
    reference_radius: Mapped[float] = mapped_column(Float)
    hard_cutoff: Mapped[float] = mapped_column(Float)
    saturation_point: Mapped[float] = mapped_column(Float)
    proximity_weight: Mapped[float] = mapped_column(Float)
    density_weight: Mapped[float] = mapped_column(Float)
    count_ceiling: Mapped[float | None] = mapped_column(Float)
    drive_decay_constant: Mapped[float | None] = mapped_column(Float)
    drive_reference_radius: Mapped[float | None] = mapped_column(Float)
    drive_hard_cutoff: Mapped[float | None] = mapped_column(Float)
    osm_tags: Mapped[list[list[str]]] = mapped_column(JSONB)
    is_default: Mapped[bool] = mapped_column(Boolean)
