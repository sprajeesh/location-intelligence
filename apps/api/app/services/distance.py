import logging

from app.clients.osrm import WARNING_STRAIGHT_LINE, OSRMClient, haversine_km
from app.config.scoring_config import DistanceMode, FacilityConfig
from app.models.domain import Facility
from app.repositories.cache import CacheRepository

logger = logging.getLogger(__name__)

OSRM_TTL = 60 * 60 * 24  # 24 hours

# DistanceMode ("walk"/"drive") -> OSRM routing profile name.
_OSRM_PROFILE: dict[str, str] = {"walk": "walking", "drive": "driving"}

# Inert fallback for a facility type with no entry in FACILITY_CONFIGS — translates
# the request body's legacy driving/walking default. None of today's facility
# types hit this path; it only guards a future facility added without config.
_REQUEST_MODE_FALLBACK: dict[str, DistanceMode] = {"driving": "drive", "walking": "walk"}


def _cache_key(lat1: float, lon1: float, lat2: float, lon2: float, mode: str) -> str:
    return f"osrm:{round(lat1, 4)},{round(lon1, 4)}:{round(lat2, 4)},{round(lon2, 4)}:{mode}"


DEFAULT_MAX_DESTINATIONS_PER_LEG = 200


class DistanceService:
    def __init__(
        self,
        osrm: OSRMClient,
        cache: CacheRepository,
        facility_configs: dict[str, FacilityConfig],
        max_destinations_per_leg: int = DEFAULT_MAX_DESTINATIONS_PER_LEG,
    ) -> None:
        self._osrm = osrm
        self._cache = cache
        self._facility_configs = facility_configs
        self._max_destinations_per_leg = max_destinations_per_leg

    async def attach_distances(
        self,
        facilities: list[Facility],
        origin_lat: float,
        origin_lon: float,
        mode: str = "driving",
    ) -> list[str]:
        """Compute and attach distance(s) to each facility in-place, grouped by
        facility type so each type is routed with its own configured distance
        mode (walk/drive/best_of_both) rather than one mode for everything.

        Returns a list of warnings generated during distance computation.
        """
        warnings: list[str] = []
        fallback_warned = False

        by_type: dict[str, list[Facility]] = {}
        for facility in facilities:
            by_type.setdefault(facility.category, []).append(facility)

        for facility_type, group in by_type.items():
            cfg = self._facility_configs.get(facility_type)
            facility_mode: DistanceMode = (
                cfg.distance_mode if cfg else _REQUEST_MODE_FALLBACK.get(mode, "drive")
            )

            if facility_mode == "best_of_both":
                used_fallback, truncated = await self._attach_leg(
                    group, origin_lat, origin_lon, "walk", "walk_distance_km"
                )
                drive_fallback, drive_truncated = await self._attach_leg(
                    group, origin_lat, origin_lon, "drive", "drive_distance_km"
                )
                used_fallback = used_fallback or drive_fallback
                truncated = max(truncated, drive_truncated)
            else:
                used_fallback, truncated = await self._attach_leg(
                    group, origin_lat, origin_lon, facility_mode, "distance_km"
                )

            if used_fallback and not fallback_warned:
                warnings.append(WARNING_STRAIGHT_LINE)
                fallback_warned = True

            if truncated:
                warnings.append(
                    f"Too many {facility_type} results — distances limited to the "
                    f"nearest {self._max_destinations_per_leg}"
                )

        return warnings

    async def _attach_leg(
        self,
        group: list[Facility],
        origin_lat: float,
        origin_lon: float,
        leg_mode: DistanceMode,
        attr: str,
    ) -> tuple[bool, int]:
        """Fetch one distance leg (walk or drive) for a group of same-type
        facilities, batched via a single OSRM table call for cache misses.

        Returns (used_fallback, truncated_count). Cache misses beyond
        `_max_destinations_per_leg` are dropped (no distance ever set on
        those facilities) rather than sent to OSRM uncapped -- a defense-in-
        depth bound independent of how many facilities Overpass returned.
        Kept ones are the nearest by straight-line distance, not just the
        first `_max_destinations_per_leg` in Overpass's response order."""
        profile = _OSRM_PROFILE[leg_mode]
        to_fetch: list[Facility] = []

        for facility in group:
            key = _cache_key(origin_lat, origin_lon, facility.lat, facility.lon, leg_mode)
            cached = await self._cache.get(key)
            if cached is not None and isinstance(cached, dict):
                setattr(facility, attr, cached["distance_km"])
            else:
                to_fetch.append(facility)

        if not to_fetch:
            return False, 0

        truncated_count = max(0, len(to_fetch) - self._max_destinations_per_leg)
        to_fetch.sort(key=lambda f: haversine_km(origin_lat, origin_lon, f.lat, f.lon))
        to_fetch = to_fetch[: self._max_destinations_per_leg]

        destinations = [(f.lat, f.lon) for f in to_fetch]
        distances, used_fallback = await self._osrm.table_distances_km(
            origin_lat, origin_lon, destinations, profile
        )

        for facility, dist_km in zip(to_fetch, distances):
            rounded = round(dist_km, 3)
            setattr(facility, attr, rounded)
            key = _cache_key(origin_lat, origin_lon, facility.lat, facility.lon, leg_mode)
            await self._cache.set(key, {"distance_km": rounded}, OSRM_TTL)

        return used_fallback, truncated_count
