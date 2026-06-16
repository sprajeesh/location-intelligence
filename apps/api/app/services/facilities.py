import asyncio
import logging

from app.clients.overpass import OverpassClient
from app.models.domain import Facility
from app.repositories.cache import CacheRepository

logger = logging.getLogger(__name__)

OVERPASS_TTL = 60 * 60 * 24  # 24 hours


def _cache_key(lat: float, lon: float, radius_km: float, category: str) -> str:
    return f"overpass:{round(lat, 4)}:{round(lon, 4)}:{radius_km}:{category}"


class FacilitiesService:
    def __init__(self, overpass: OverpassClient, cache: CacheRepository) -> None:
        self._overpass = overpass
        self._cache = cache

    async def fetch_category(
        self,
        category: str,
        lat: float,
        lon: float,
        radius_km: float,
    ) -> tuple[list[Facility], str | None]:
        """Fetch facilities for a single category.

        Returns (facilities, warning_or_none).
        """
        key = _cache_key(lat, lon, radius_km, category)
        cached = await self._cache.get(key)
        if cached is not None:
            logger.debug("Overpass cache hit: %s", key)
            facilities = [Facility(**item) for item in cached]  # type: ignore[arg-type]
            return facilities, None

        try:
            raw = await self._overpass.fetch_category(category, lat, lon, radius_km)
        except Exception as exc:
            logger.error("Overpass failed for category %s: %s", category, exc)
            return [], f"Could not fetch {category} data"

        facilities = [
            Facility(
                id=item["id"],
                name=item["name"],
                category=item["category"],
                lat=item["lat"],
                lon=item["lon"],
            )
            for item in raw
        ]

        # Cache the serialisable form
        await self._cache.set(
            key,
            [
                {
                    "id": f.id,
                    "name": f.name,
                    "category": f.category,
                    "lat": f.lat,
                    "lon": f.lon,
                    "distance_km": f.distance_km,
                }
                for f in facilities
            ],
            OVERPASS_TTL,
        )

        return facilities, None

    async def fetch_all(
        self,
        categories: list[str],
        lat: float,
        lon: float,
        radius_km: float,
    ) -> tuple[list[Facility], list[str]]:
        """Fetch all requested categories in parallel.

        Returns (all_facilities, warnings).
        """
        tasks = [self.fetch_category(cat, lat, lon, radius_km) for cat in categories]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        all_facilities: list[Facility] = []
        warnings: list[str] = []
        seen_ids: set[str] = set()

        for facilities, warning in results:
            if warning:
                warnings.append(warning)
            for f in facilities:
                if f.id not in seen_ids:
                    seen_ids.add(f.id)
                    all_facilities.append(f)

        return all_facilities, warnings
