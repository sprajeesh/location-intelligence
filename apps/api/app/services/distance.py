import logging

from app.clients.osrm import WARNING_STRAIGHT_LINE, OSRMClient
from app.models.domain import Facility
from app.repositories.cache import CacheRepository

logger = logging.getLogger(__name__)

OSRM_TTL = 60 * 60 * 24  # 24 hours


def _cache_key(lat1: float, lon1: float, lat2: float, lon2: float, mode: str) -> str:
    return (
        f"osrm:{round(lat1, 4)},{round(lon1, 4)}:{round(lat2, 4)},{round(lon2, 4)}:{mode}"
    )


class DistanceService:
    def __init__(self, osrm: OSRMClient, cache: CacheRepository) -> None:
        self._osrm = osrm
        self._cache = cache
        self._used_fallback = False

    async def attach_distances(
        self,
        facilities: list[Facility],
        origin_lat: float,
        origin_lon: float,
        mode: str = "driving",
    ) -> list[str]:
        """Compute and attach distance_km to each facility in-place.

        Returns a list of warnings generated during distance computation.
        """
        warnings: list[str] = []
        fallback_warned = False

        for facility in facilities:
            key = _cache_key(origin_lat, origin_lon, facility.lat, facility.lon, mode)
            cached = await self._cache.get(key)
            if cached is not None and isinstance(cached, dict):
                facility.distance_km = cached["distance_km"]
                continue

            dist_km, used_fallback = await self._osrm.route_distance_km(
                origin_lat, origin_lon, facility.lat, facility.lon, mode=mode
            )
            facility.distance_km = round(dist_km, 3)

            await self._cache.set(key, {"distance_km": facility.distance_km}, OSRM_TTL)

            if used_fallback and not fallback_warned:
                warnings.append(WARNING_STRAIGHT_LINE)
                fallback_warned = True

        return warnings
