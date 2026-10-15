import uuid
from typing import Any

from sqlalchemy import cast, func, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.elements import ColumnElement

from app.models.map_correction import Geography, MapCorrection


def _point(lat: float, lon: float) -> ColumnElement[Any]:
    """Geography point for (lon, lat). ST_MakePoint takes x (lon) before y (lat)."""
    return cast(func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326), Geography())


class MapCorrectionRepository:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory

    async def insert(
        self,
        *,
        correction_type: str,
        facility_type_slug: str,
        lat: float,
        lon: float,
        client_ip_hash: str,
        target_osm_id: str | None = None,
        name: str | None = None,
        address: str | None = None,
        reason: str | None = None,
        reporter_email: str | None = None,
        dedupe_checked: bool = True,
    ) -> MapCorrection:
        """Insert a pending correction and return it with its server-set columns.

        The database enforces the per-type rules, so an invalid combination raises
        `sqlalchemy.exc.IntegrityError` rather than being silently stored.
        """
        row = MapCorrection(
            correction_type=correction_type,
            facility_type_slug=facility_type_slug,
            target_osm_id=target_osm_id,
            name=name,
            address=address,
            reason=reason,
            geom=_point(lat, lon),
            reporter_email=reporter_email,
            client_ip_hash=client_ip_hash,
            dedupe_checked=dedupe_checked,
        )
        async with self._session_factory() as session, session.begin():
            session.add(row)
            await session.flush()
            await session.refresh(row)
        return row

    async def find_pending_add_near(
        self,
        facility_type_slug: str,
        lat: float,
        lon: float,
        radius_m: float,
    ) -> list[MapCorrection]:
        """Pending `add` corrections for a facility type within `radius_m` metres, nearest first."""
        point = _point(lat, lon)
        stmt = (
            select(MapCorrection)
            .where(
                MapCorrection.correction_type == "add",
                MapCorrection.status == "pending",
                MapCorrection.facility_type_slug == facility_type_slug,
                func.ST_DWithin(MapCorrection.geom, point, radius_m),
            )
            .order_by(func.ST_Distance(MapCorrection.geom, point), MapCorrection.id)
        )
        async with self._session_factory() as session:
            return list(await session.scalars(stmt))

    async def find_pending_remove_for_target(self, target_osm_id: str) -> list[MapCorrection]:
        """Pending `remove` corrections for one OSM element, oldest first."""
        stmt = (
            select(MapCorrection)
            .where(
                MapCorrection.correction_type == "remove",
                MapCorrection.status == "pending",
                MapCorrection.target_osm_id == target_osm_id,
            )
            .order_by(MapCorrection.created_at, MapCorrection.id)
        )
        async with self._session_factory() as session:
            return list(await session.scalars(stmt))

    async def increment_report_count(self, correction_id: uuid.UUID) -> int | None:
        """Bump `report_count` for a duplicate report.

        Returns the new count, or None if no row matched.
        """
        stmt = (
            update(MapCorrection)
            .where(MapCorrection.id == correction_id)
            .values(report_count=MapCorrection.report_count + 1)
            .returning(MapCorrection.report_count)
            .execution_options(synchronize_session=False)
        )
        async with self._session_factory() as session, session.begin():
            return await session.scalar(stmt)
