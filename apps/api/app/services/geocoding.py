import hashlib
import logging

from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository

logger = logging.getLogger(__name__)

GEOCODE_TTL = 60 * 60 * 24 * 30  # 30 days


def _cache_key(query: str) -> str:
    digest = hashlib.sha256(query.encode()).hexdigest()[:16]
    return f"geocode:{digest}"


class GeocodingService:
    def __init__(self, address_repo: AddressRepository, cache: CacheRepository) -> None:
        self._repo = address_repo
        self._cache = cache

    async def search(self, query: str, country: str = "nz") -> list[dict]:
        """Return list of address suggestions for `query`.

        Each entry has: displayName, lat, lon.
        The `country` parameter is accepted for API compatibility but ignored —
        the LINZ PostGIS database is NZ-only.
        """
        key = _cache_key(f"{country}:{query}")
        cached = await self._cache.get(key)
        if cached is not None:
            logger.debug("Geocode cache hit for query=%s", query)
            return cached  # type: ignore[return-value]

        try:
            results = await self._repo.search(query)
        except Exception as exc:
            logger.error("Address DB query failed: %s", exc)
            raise

        if results:
            await self._cache.set(key, results, GEOCODE_TTL)

        return results

    async def geocode_first(self, query: str, country: str = "nz") -> dict | None:
        """Return the best single geocode result, or None if not found."""
        results = await self.search(query, country=country)
        return results[0] if results else None
