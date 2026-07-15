import logging
import math

import httpx

logger = logging.getLogger(__name__)

WARNING_STRAIGHT_LINE = "Using straight-line distance (road distance unavailable)"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometres."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


class OSRMClient:
    def __init__(self, base_url: str, http_client: httpx.AsyncClient) -> None:
        self._base_url = base_url.rstrip("/")
        self._http = http_client

    async def table_distances_km(
        self,
        origin_lat: float,
        origin_lon: float,
        destinations: list[tuple[float, float]],
        profile: str = "driving",
    ) -> tuple[list[float], bool]:
        """One-to-many routed distances from an origin to each destination.

        Uses OSRM's `table` service (one HTTP call per facility type per address)
        rather than one `route` call per POI. Returns (distances_km, used_fallback);
        used_fallback is True if the whole request failed, or any individual
        origin-destination pair fell back to Haversine because OSRM reported it
        as unreachable.
        """
        if not destinations:
            return [], False

        coords = ";".join(
            [f"{origin_lon},{origin_lat}"] + [f"{lon},{lat}" for lat, lon in destinations]
        )
        dest_indices = ";".join(str(i) for i in range(1, len(destinations) + 1))
        url = f"{self._base_url}/table/v1/{profile}/{coords}"
        params = {"sources": "0", "destinations": dest_indices, "annotations": "distance"}

        try:
            response = await self._http.get(url, params=params, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            row = data["distances"][0]
            if len(row) != len(destinations):
                raise ValueError(
                    f"OSRM returned {len(row)} distances, expected {len(destinations)}"
                )
            distances: list[float] = []
            used_fallback = False
            for (lat, lon), meters in zip(destinations, row):
                if meters is None:
                    distances.append(haversine_km(origin_lat, origin_lon, lat, lon))
                    used_fallback = True
                else:
                    distances.append(meters / 1000.0)
            return distances, used_fallback
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError) as exc:
            logger.warning("OSRM unavailable, falling back to Haversine: %s", exc)
            return [
                haversine_km(origin_lat, origin_lon, lat, lon) for lat, lon in destinations
            ], True
        except Exception as exc:
            logger.warning("OSRM request failed, falling back to Haversine: %s", exc)
            return [
                haversine_km(origin_lat, origin_lon, lat, lon) for lat, lon in destinations
            ], True
