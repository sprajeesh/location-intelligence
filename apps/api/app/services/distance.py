import logging

from app.clients.osrm import WARNING_STRAIGHT_LINE, OSRMClient
from app.config.scoring_config import FACILITY_CONFIGS, DistanceMode
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


class DistanceService:
    def __init__(self, osrm: OSRMClient, cache: CacheRepository) -> None:
        self._osrm = osrm
        self._cache = cache

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
            cfg = FACILITY_CONFIGS.get(facility_type)
            facility_mode: DistanceMode = (
                cfg.distance_mode if cfg else _REQUEST_MODE_FALLBACK.get(mode, "drive")
            )

            if facility_mode == "best_of_both":
                used_fallback = await self._attach_leg(
                    group, origin_lat, origin_lon, "walk", "walk_distance_km"
                )
                drive_fallback = await self._attach_leg(
                    group, origin_lat, origin_lon, "drive", "drive_distance_km"
                )
                used_fallback = used_fallback or drive_fallback
            else:
                used_fallback = await self._attach_leg(
                    group, origin_lat, origin_lon, facility_mode, "distance_km"
                )

            if used_fallback and not fallback_warned:
                warnings.append(WARNING_STRAIGHT_LINE)
                fallback_warned = True

        return warnings

    async def _attach_leg(
        self,
        group: list[Facility],
        origin_lat: float,
        origin_lon: float,
        leg_mode: DistanceMode,
        attr: str,
    ) -> bool:
        """Fetch one distance leg (walk or drive) for a group of same-type
        facilities, batched via a single OSRM table call for cache misses."""
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
            return False

        destinations = [(f.lat, f.lon) for f in to_fetch]
        distances, used_fallback = await self._osrm.table_distances_km(
            origin_lat, origin_lon, destinations, profile
        )

        for facility, dist_km in zip(to_fetch, distances):
            rounded = round(dist_km, 3)
            setattr(facility, attr, rounded)
            key = _cache_key(origin_lat, origin_lon, facility.lat, facility.lon, leg_mode)
            await self._cache.set(key, {"distance_km": rounded}, OSRM_TTL)

        return used_fallback
