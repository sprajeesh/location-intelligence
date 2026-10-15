import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import TIMESTAMP, Boolean, ForeignKey, Integer, Text, func, literal_column, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, column_property, mapped_column
from sqlalchemy.types import UserDefinedType

from app.models.base import Base


class Geography(UserDefinedType):
    """Opaque PostGIS `GEOGRAPHY(Point, 4326)`.

    The column is written with an explicit cast in the repository and read back
    only through the `lon`/`lat` expressions below, so no Python value is ever
    decoded from it.
    """

    cache_ok = True

    def get_col_spec(self, **_: Any) -> str:
        return "GEOGRAPHY(Point, 4326)"


# Column-level cast for the coordinate expressions above; the table is always
# referenced by its own name, so no alias is involved.
_geom_as_geometry = literal_column("map_corrections.geom::geometry")


class MapCorrection(Base):
    """User-submitted Map correction (`add` or `remove`), managed by Alembic.

    Per-type rules (which columns are required and which must be NULL) are
    enforced by CHECK constraints in migration 0008; see docs/DATA_MODEL.md.
    Kept separate from the read-only `FacilityType` and `CategoryWeight` mappings.
    """

    __tablename__ = "map_corrections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    correction_type: Mapped[str] = mapped_column(Text)
    facility_type_slug: Mapped[str] = mapped_column(Text, ForeignKey("facility_types.slug"))
    target_osm_id: Mapped[str | None] = mapped_column(Text)
    name: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    # Longitude first, like every other geometry in this repo. Deferred so the
    # opaque geography value is never selected; use `lon` and `lat` instead.
    geom: Mapped[Any] = mapped_column(Geography(), deferred=True)
    lon: Mapped[float] = column_property(func.ST_X(_geom_as_geometry))
    lat: Mapped[float] = column_property(func.ST_Y(_geom_as_geometry))
    reporter_email: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default=text("'pending'"))
    report_count: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    dedupe_checked: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    review_note: Mapped[str | None] = mapped_column(Text)
    osm_element_id: Mapped[str | None] = mapped_column(Text)
    client_ip_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
