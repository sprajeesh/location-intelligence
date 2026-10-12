from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.facility import CategoryWeight, FacilityType


class FacilityConfigRepository:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory

    async def fetch_facility_types(self) -> list[FacilityType]:
        """All facility_types rows, ordered by slug."""
        stmt = select(FacilityType).order_by(FacilityType.slug)
        async with self._session_factory() as session:
            return list(await session.scalars(stmt))

    async def fetch_category_weights(self) -> list[CategoryWeight]:
        """All category_weights rows, ordered by category."""
        stmt = select(CategoryWeight).order_by(CategoryWeight.category)
        async with self._session_factory() as session:
            return list(await session.scalars(stmt))
