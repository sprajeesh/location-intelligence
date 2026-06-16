import logging

import httpx

logger = logging.getLogger(__name__)


class PhotonClient:
    def __init__(self, base_url: str, http_client: httpx.AsyncClient) -> None:
        self._base_url = base_url.rstrip("/")
        self._http = http_client

    async def search(self, query: str, country: str = "nz", limit: int = 5) -> list[dict]:
        """Search addresses via Photon geocoding API.

        Returns a list of dicts with keys: displayName, lat, lon.
        Raises httpx.HTTPError on network issues.
        """
        url = f"{self._base_url}/api"
        params = {"q": query, "countrycodes": country, "limit": limit}
        response = await self._http.get(url, params=params, timeout=10.0)
        response.raise_for_status()
        data = response.json()

        results: list[dict] = []
        for feature in data.get("features", []):
            coords = feature.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            lon, lat = coords[0], coords[1]
            props = feature.get("properties", {})
            display_name = _build_display_name(props)
            results.append({"displayName": display_name, "lat": lat, "lon": lon})

        return results


def _build_display_name(props: dict) -> str:
    """Build a human-readable display name from Photon feature properties."""
    parts: list[str] = []

    # Try street address first
    street = props.get("street") or props.get("name")
    housenumber = props.get("housenumber")
    if street and housenumber:
        parts.append(f"{housenumber} {street}")
    elif street:
        parts.append(street)

    city = props.get("city") or props.get("town") or props.get("village")
    if city:
        parts.append(city)
    elif props.get("state"):
        parts.append(props["state"])

    if not parts:
        # Fallback: use whatever name is available
        name = props.get("name", "Unknown")
        parts.append(name)

    return ", ".join(parts)
