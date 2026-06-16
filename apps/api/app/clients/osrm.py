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

    async def route_distance_km(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
        mode: str = "driving",
    ) -> tuple[float, bool]:
        """Return (distance_km, used_fallback).

        Tries OSRM first; on connection error falls back to Haversine.
        """
        url = f"{self._base_url}/route/v1/{mode}/{lon1},{lat1};{lon2},{lat2}"
        params = {"overview": "false"}
        try:
            response = await self._http.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            routes = data.get("routes", [])
            if not routes:
                raise ValueError("No routes returned by OSRM")
            distance_m = routes[0]["distance"]
            return distance_m / 1000.0, False
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError) as exc:
            logger.warning("OSRM unavailable, falling back to Haversine: %s", exc)
            return haversine_km(lat1, lon1, lat2, lon2), True
        except Exception as exc:
            logger.warning("OSRM request failed, falling back to Haversine: %s", exc)
            return haversine_km(lat1, lon1, lat2, lon2), True
