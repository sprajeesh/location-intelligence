import logging
import unicodedata

from sqlalchemy import case, func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.address import Address
from app.repositories.db.errors import QueryTimeoutError, is_query_timeout

logger = logging.getLogger(__name__)


class AddressRepository:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory

    async def search(self, query: str, limit: int = 5) -> list[Address]:
        """Search NZ addresses using trigram-accelerated ILIKE.

        Matches against `full_address_ascii` (handles macrons/diacritics). Returns
        ORM `Address` rows; mapping to DTOs happens in the service layer.
        """
        normalized_query = (
            unicodedata.normalize("NFKD", query).encode("ascii", "ignore").decode("ascii")
        )
        stmt = (
            select(Address)
            .where(
                Address.full_address_ascii.ilike(f"%{normalized_query}%"),
                Address.shape_x.is_not(None),
                Address.shape_y.is_not(None),
            )
            .order_by(
                case((Address.full_address_ascii.ilike(f"{normalized_query}%"), 0), else_=1),
                func.length(Address.full_address_ascii),
                # Stable tie-break so equal-length matches don't reorder between calls.
                Address.id,
            )
            .limit(limit)
        )
        async with self._session_factory() as session:
            try:
                result = await session.scalars(stmt)
            except DBAPIError as exc:
                if is_query_timeout(exc):
                    raise QueryTimeoutError("Address search exceeded statement timeout") from exc
                raise
            return list(result)
