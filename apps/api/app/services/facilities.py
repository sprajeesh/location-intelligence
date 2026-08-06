import asyncio
import logging

from app.clients.overpass import OverpassClient
from app.config.scoring_config_loader import ScoringConfig
from app.models.domain import Facility
from app.repositories.cache import CacheRepository

logger = logging.getLogger(__name__)

OVERPASS_TTL = 60 * 60 * 24  # 24 hours

_BATCH_SIZE = 6  # max categories merged into a single Overpass query


def _cache_key(lat: float, lon: float, radius_km: float, category: str) -> str:
    return f"overpass:{round(lat, 4)}:{round(lon, 4)}:{radius_km}:{category}"


class FacilitiesService:
    def __init__(
        self, overpass: OverpassClient, cache: CacheRepository, scoring_config: ScoringConfig
    ) -> None:
        self._overpass = overpass
        self._cache = cache
        self._scoring_config = scoring_config

    async def _check_cache(
        self, category: str, lat: float, lon: float, radius_km: float
    ) -> tuple[str, float, list[Facility] | None]:
        """Cache lookup for one category.

        Returns (category, effective_radius_km, cached_or_None).
        """
        effective_radius_km = self._scoring_config.fetch_radius_km(category, radius_km)
        key = _cache_key(lat, lon, effective_radius_km, category)
        cached = await self._cache.get(key)
        if cached is None:
            return category, effective_radius_km, None
        logger.debug("Overpass cache hit: %s", key)
        facilities = [Facility(**item) for item in cached]  # type: ignore[arg-type]
        return category, effective_radius_km, facilities

    async def _fetch_batch(
        self, batch: list[tuple[str, float]], lat: float, lon: float
    ) -> dict[str, list[dict]]:
        """batch: [(category, effective_radius_km), ...]. Raises on failure — every
        category in this batch fails together (see fetch_all for isolation across
        batches)."""
        specs = [
            (cat, self._scoring_config.category_tags.get(cat, []), int(radius_km * 1000))
            for cat, radius_km in batch
        ]
        return await self._overpass.fetch_categories(specs, lat, lon)

    async def fetch_all(
        self,
        categories: list[str],
        lat: float,
        lon: float,
        radius_km: float,
    ) -> tuple[list[Facility], list[str], set[str]]:
        """Fetch all requested categories.

        Cache is checked per-category first (cheap, concurrent Redis lookups).
        Categories that miss are grouped into batches of up to `_BATCH_SIZE` and
        each batch is fetched as a single merged Overpass query — this keeps the
        number of concurrent/total Overpass HTTP calls small regardless of how
        many categories are requested. A batch that fails only fails the
        categories in that batch; `OverpassClient`'s own semaphore bounds real
        concurrency against Overpass app-wide.

        Returns (all_facilities, warnings, failed_categories). `failed_categories`
        holds categories whose data source errored out — distinct from a category
        that was successfully checked and legitimately found nothing (see scoring
        service's not_checked vs. checked-zero handling).
        """
        all_facilities: list[Facility] = []
        warnings: list[str] = []
        failed_categories: set[str] = set()
        seen_ids: set[tuple[str, str]] = set()

        def _add(facilities: list[Facility]) -> None:
            for f in facilities:
                key = (f.category, f.id)
                if key not in seen_ids:
                    seen_ids.add(key)
                    all_facilities.append(f)

        cache_results = await asyncio.gather(
            *(self._check_cache(cat, lat, lon, radius_km) for cat in categories)
        )

        miss_specs: list[tuple[str, float]] = []
        for category, effective_radius_km, cached in cache_results:
            if cached is not None:
                _add(cached)
            else:
                miss_specs.append((category, effective_radius_km))

        if not miss_specs:
            return all_facilities, warnings, failed_categories

        batches = [
            miss_specs[i : i + _BATCH_SIZE] for i in range(0, len(miss_specs), _BATCH_SIZE)
        ]
        batch_results = await asyncio.gather(
            *(self._fetch_batch(batch, lat, lon) for batch in batches),
            return_exceptions=True,
        )

        for batch, result in zip(batches, batch_results):
            if isinstance(result, BaseException):
                logger.error(
                    "Overpass batch failed for %s: %s", [cat for cat, _ in batch], result
                )
                for category, _effective_radius_km in batch:
                    warnings.append(f"Could not fetch {category} data")
                    failed_categories.add(category)
                continue

            for category, effective_radius_km in batch:
                raw = result.get(category, [])
                facilities = [Facility(**item) for item in raw]
                await self._cache.set(
                    _cache_key(lat, lon, effective_radius_km, category),
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
                _add(facilities)

        return all_facilities, warnings, failed_categories
