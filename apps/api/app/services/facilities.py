import asyncio
import logging

from app.clients.overpass import OverpassClient
from app.config.scoring_config_loader import ScoringConfig
from app.models.domain import Facility
from app.repositories.cache import CacheRepository

logger = logging.getLogger(__name__)

OVERPASS_TTL = 60 * 60 * 24  # 24 hours


def _cache_key(lat: float, lon: float, radius_km: float, category: str) -> str:
    return f"overpass:{round(lat, 4)}:{round(lon, 4)}:{radius_km}:{category}"


class FacilitiesService:
    def __init__(
        self, overpass: OverpassClient, cache: CacheRepository, scoring_config: ScoringConfig
    ) -> None:
        self._overpass = overpass
        self._cache = cache
        self._scoring_config = scoring_config

    async def fetch_category(
        self,
        category: str,
        lat: float,
        lon: float,
        radius_km: float,
    ) -> tuple[list[Facility], str | None]:
        """Fetch facilities for a single category.

        `radius_km` is the user's requested search radius; the actual Overpass
        query is bounded by min(radius_km, this facility's hard_cutoff) — the
        same cutoff the density scoring formula filters against, so we never
        fetch data the scorer can't use, and never truncate data it could.

        Returns (facilities, warning_or_none).
        """
        effective_radius_km = self._scoring_config.fetch_radius_km(category, radius_km)
        key = _cache_key(lat, lon, effective_radius_km, category)
        cached = await self._cache.get(key)
        if cached is not None:
            logger.debug("Overpass cache hit: %s", key)
            facilities = [Facility(**item) for item in cached]  # type: ignore[arg-type]
            return facilities, None

        try:
            raw = await self._overpass.fetch_category(category, lat, lon, effective_radius_km)
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

        # Cache the serialisable form (distances aren't computed yet at fetch time)
        await self._cache.set(
            key,
            [
                {
                    "id": f.id,
                    "name": f.name,
                    "category": f.category,
                    "lat": f.lat,
                    "lon": f.lon,
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
    ) -> tuple[list[Facility], list[str], set[str]]:
        """Fetch all requested categories in parallel.

        Returns (all_facilities, warnings, failed_categories). `failed_categories`
        holds categories whose data source errored out — distinct from a category
        that was successfully checked and legitimately found nothing (see scoring
        service's not_checked vs. checked-zero handling).
        """
        tasks = [self.fetch_category(cat, lat, lon, radius_km) for cat in categories]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        all_facilities: list[Facility] = []
        warnings: list[str] = []
        failed_categories: set[str] = set()
        seen_ids: set[tuple[str, str]] = set()

        for cat, (facilities, warning) in zip(categories, results):
            if warning:
                warnings.append(warning)
                failed_categories.add(cat)
            for f in facilities:
                key = (f.category, f.id)
                if key not in seen_ids:
                    seen_ids.add(key)
                    all_facilities.append(f)

        return all_facilities, warnings, failed_categories
