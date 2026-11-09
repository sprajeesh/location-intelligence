import asyncio
import logging

from app.clients.overpass import OverpassClient, parse_category_elements
from app.config.scoring_config_loader import ScoringConfig
from app.logging_config import exception_fields
from app.models.domain import Facility
from app.repositories.cache import CacheRepository
from app.repositories.db.poi_snapshot_repository import PoiSnapshotRepository

logger = logging.getLogger(__name__)

OVERPASS_TTL = 60 * 60 * 24  # 24 hours

_BATCH_SIZE = 6  # max categories merged into a single Overpass query


def _cache_key(lat: float, lon: float, radius_km: float, category: str) -> str:
    return f"overpass:{round(lat, 4)}:{round(lon, 4)}:{radius_km}:{category}"


class FacilitiesService:
    """Fetches facilities per category from the best available source.

    Categories whose every OSM tag pair is covered by the local POI snapshot
    (see app/poi_snapshot and docs/POI_SNAPSHOT.md) are read from PostGIS. All
    other categories take the Overpass path: Redis cache, then merged batches.
    With no snapshot (`poi_snapshot=None` or an empty `snapshot_pairs`) every
    category goes to Overpass, which is the pre-snapshot behaviour.
    """

    def __init__(
        self,
        overpass: OverpassClient,
        cache: CacheRepository,
        scoring_config: ScoringConfig,
        poi_snapshot: PoiSnapshotRepository | None = None,
        snapshot_pairs: frozenset[tuple[str, str]] = frozenset(),
    ) -> None:
        self._overpass = overpass
        self._cache = cache
        self._scoring_config = scoring_config
        self._poi_snapshot = poi_snapshot
        self._snapshot_pairs = snapshot_pairs

    def is_snapshot_covered(self, category: str) -> bool:
        """True when the snapshot holds every tag pair the category needs."""
        if self._poi_snapshot is None:
            return False
        tags = self._scoring_config.category_tags.get(category, [])
        return bool(tags) and all(tuple(pair) in self._snapshot_pairs for pair in tags)

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

    async def _fetch_from_snapshot(
        self, category: str, lat: float, lon: float, radius_km: float
    ) -> list[Facility]:
        """Read one category from the local POI snapshot. Raises on DB failure."""
        if self._poi_snapshot is None:
            raise RuntimeError("POI snapshot is not configured")
        tags = self._scoring_config.category_tags.get(category, [])
        effective_radius_km = self._scoring_config.fetch_radius_km(category, radius_km)
        radius_m = int(effective_radius_km * 1000)  # same rounding as the Overpass path
        elements = await self._poi_snapshot.find_elements_near(tags, lat, lon, radius_m)
        parsed = parse_category_elements(elements, [(category, tags, radius_m)])
        return [Facility(**item) for item in parsed[category]]

    async def fetch_all(
        self,
        categories: list[str],
        lat: float,
        lon: float,
        radius_km: float,
    ) -> tuple[list[Facility], list[str], set[str]]:
        """Fetch all requested categories.

        Snapshot-covered categories are queried in PostGIS (no cache, no Overpass
        call). The rest are checked against the Redis cache first, then the misses
        are grouped into batches of up to `_BATCH_SIZE`, each fetched as a single
        merged Overpass query, which keeps the number of Overpass HTTP calls small.
        A failed batch or snapshot query only fails the categories it covers;
        `OverpassClient`'s own semaphore bounds real concurrency against Overpass.

        Returns (all_facilities, warnings, failed_categories). `failed_categories`
        holds categories whose data source errored out, distinct from a category
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

        def _fail(category: str) -> None:
            warnings.append(f"Could not fetch {category} data")
            failed_categories.add(category)

        snapshot_categories = [cat for cat in categories if self.is_snapshot_covered(cat)]
        overpass_categories = [cat for cat in categories if not self.is_snapshot_covered(cat)]

        if snapshot_categories:
            snapshot_results = await asyncio.gather(
                *(
                    self._fetch_from_snapshot(cat, lat, lon, radius_km)
                    for cat in snapshot_categories
                ),
                return_exceptions=True,
            )
            for category, result in zip(snapshot_categories, snapshot_results):
                if isinstance(result, BaseException):
                    logger.error(
                        "POI snapshot query failed",
                        extra={
                            "event": "poi_snapshot.query_failed",
                            "category": category,
                            **exception_fields(result),
                        },
                    )
                    _fail(category)
                    continue
                _add(result)

        cache_results = await asyncio.gather(
            *(self._check_cache(cat, lat, lon, radius_km) for cat in overpass_categories)
        )

        miss_specs: list[tuple[str, float]] = []
        for category, effective_radius_km, cached in cache_results:
            if cached is not None:
                _add(cached)
            else:
                miss_specs.append((category, effective_radius_km))

        if not miss_specs:
            return all_facilities, warnings, failed_categories

        batches = [miss_specs[i : i + _BATCH_SIZE] for i in range(0, len(miss_specs), _BATCH_SIZE)]
        batch_results = await asyncio.gather(
            *(self._fetch_batch(batch, lat, lon) for batch in batches),
            return_exceptions=True,
        )

        for batch, result in zip(batches, batch_results):
            if isinstance(result, BaseException):
                logger.error(
                    "Overpass batch failed",
                    extra={
                        "event": "overpass.batch_failed",
                        "categories": [cat for cat, _ in batch],
                        **exception_fields(result),
                    },
                )
                for category, _effective_radius_km in batch:
                    _fail(category)
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
                            "details": f.details,
                        }
                        for f in facilities
                    ],
                    OVERPASS_TTL,
                )
                _add(facilities)

        return all_facilities, warnings, failed_categories
