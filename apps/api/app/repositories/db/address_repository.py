import unicodedata
import logging

import asyncpg

logger = logging.getLogger(__name__)


class AddressRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def search(self, query: str, limit: int = 5) -> list[dict]:
        """Search NZ addresses using trigram-accelerated ILIKE.

        Returns list of dicts with keys: displayName, lat, lon.
        Uses full_address_ascii for matching (handles macrons/diacritics),
        but returns full_address as displayName for correct NZ spelling.
        """
        normalized_query = (
            unicodedata.normalize("NFKD", query).encode("ascii", "ignore").decode("ascii")
        )
        sql = """
            SELECT
                full_address  AS display_name,
                shape_y       AS lat,
                shape_x       AS lon
            FROM addresses
            WHERE full_address_ascii ILIKE '%' || $1 || '%'
            ORDER BY
                CASE WHEN full_address_ascii ILIKE $1 || '%' THEN 0 ELSE 1 END,
                length(full_address_ascii)
            LIMIT $2
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, normalized_query, limit)

        return [
            {
                "displayName": row["display_name"],
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
            }
            for row in rows
            if row["lat"] is not None and row["lon"] is not None
        ]
