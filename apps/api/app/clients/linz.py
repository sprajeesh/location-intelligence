import asyncio
import logging

import httpx

from app.clients.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

QUERY_API_URL = "https://data.linz.govt.nz/services/query/v1/vector.json"

# NZ Primary Parcels -- see apps/web/src/constants/layers.ts for the frontend-facing
# copy of this same layer ID (the frontend never calls LINZ directly, but this is the
# value the requirement asked to keep as a named constant on that side too).
PARCELS_LAYER_ID = 50772

# A geocoded address point should sit inside (or right at the edge of) its own
# parcel, so a small radius is enough -- not the 10000m used for a general "features
# near this point" search.
DEFAULT_SEARCH_RADIUS_M = 100
DEFAULT_MAX_RESULTS = 3


class LinzClient:
    """Client for the LINZ Data Service Query API (vector.json).

    Used to resolve a lat/lon point to its underlying cadastral parcel via
    "nearest feature(s) to a point" lookups -- not the WFS API, which only
    supports bbox/CQL-filtered feature queries, a heavier fit for this use case.
    """

    def __init__(
        self,
        api_key: str | None,
        http_client: httpx.AsyncClient,
        *,
        max_concurrency: int = 4,
        breaker: CircuitBreaker | None = None,
    ) -> None:
        if max_concurrency < 1:
            raise ValueError(f"max_concurrency must be >= 1, got {max_concurrency}")

        self._api_key = api_key
        self._http = http_client
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._breaker = breaker

    async def find_nearest_parcel(self, lat: float, lon: float) -> dict | None:
        """Return the nearest parcel Feature (GeoJSON dict) to (lat, lon), or None
        if no parcel is within DEFAULT_SEARCH_RADIUS_M."""
        if not self._api_key:
            raise RuntimeError("LINZ API key is not configured (settings.linz_api_key)")

        if self._breaker is not None:
            return await self._breaker.call(lambda: self._query(lat, lon))
        return await self._query(lat, lon)

    async def _query(self, lat: float, lon: float) -> dict | None:
        async with self._semaphore:
            response = await self._http.get(
                QUERY_API_URL,
                params={
                    "key": self._api_key,
                    "layer": PARCELS_LAYER_ID,
                    "x": lon,
                    "y": lat,
                    "max_results": DEFAULT_MAX_RESULTS,
                    "radius": DEFAULT_SEARCH_RADIUS_M,
                    "geometry": "true",
                    "with_field_names": "true",
                },
                timeout=10.0,
            )
        response.raise_for_status()
        data = response.json()

        layers = data.get("vectorQuery", {}).get("layers", {})
        features = layers.get(str(PARCELS_LAYER_ID), {}).get("features", [])
        if not features:
            return None

        # The Query API returns features ordered nearest-first.
        return features[0]
