import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

# OSM tag definitions per category
CATEGORY_TAGS: dict[str, list[tuple[str, str]]] = {
    "schools": [("amenity", "school")],
    "bus_stops": [("highway", "bus_stop"), ("public_transport", "platform")],
}


def _build_query(tags: list[tuple[str, str]], radius_m: int, lat: float, lon: float) -> str:
    """Build an OverpassQL query for the given tags and bounding circle."""
    node_lines = []
    way_lines = []
    for key, value in tags:
        node_lines.append(f'  node["{key}"="{value}"](around:{radius_m},{lat},{lon});')
        way_lines.append(f'  way["{key}"="{value}"](around:{radius_m},{lat},{lon});')

    inner = "\n".join(node_lines + way_lines)
    return f"[out:json][timeout:25];\n(\n{inner}\n);\nout center;"


class OverpassClient:
    def __init__(self, base_url: str, http_client: httpx.AsyncClient) -> None:
        self._base_url = base_url.rstrip("/")
        self._http = http_client

    async def fetch_category(
        self,
        category: str,
        lat: float,
        lon: float,
        radius_km: float,
        retries: int = 2,
    ) -> list[dict]:
        """Fetch OSM elements for a category around a point.

        Returns list of dicts: {id, name, category, lat, lon}.
        Retries up to `retries` times with exponential backoff (1s, 2s).
        Raises on final failure.
        """
        tags = CATEGORY_TAGS.get(category, [])
        if not tags:
            logger.warning("Unknown category: %s", category)
            return []

        radius_m = int(radius_km * 1000)
        query = _build_query(tags, radius_m, lat, lon)

        last_exc: Exception | None = None
        for attempt in range(retries + 1):
            try:
                response = await self._http.post(
                    self._base_url,
                    content=query,
                    headers={
                        "Content-Type": "text/plain",
                        "Accept": "application/json",
                        "User-Agent": "LocationIntelligence/1.0",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                return _parse_elements(data.get("elements", []), category)
            except Exception as exc:
                last_exc = exc
                if attempt < retries:
                    wait = 2**attempt  # 1s, 2s
                    logger.warning(
                        "Overpass attempt %d failed for %s, retrying in %ds: %s",
                        attempt + 1,
                        category,
                        wait,
                        exc,
                    )
                    await asyncio.sleep(wait)

        raise RuntimeError(f"Overpass query failed for category '{category}'") from last_exc


def _parse_elements(elements: list[dict], category: str) -> list[dict]:
    """Parse Overpass API elements into a list of facility dicts."""
    results = []
    seen_ids: set[str] = set()

    for elem in elements:
        elem_type = elem.get("type", "")
        elem_id = elem.get("id")
        if elem_id is None:
            continue

        osm_id = f"osm_{elem_type}_{elem_id}"
        if osm_id in seen_ids:
            continue
        seen_ids.add(osm_id)

        # Get coordinates — for ways use center
        if elem_type == "node":
            lat = elem.get("lat")
            lon = elem.get("lon")
        elif elem_type == "way":
            center = elem.get("center", {})
            lat = center.get("lat")
            lon = center.get("lon")
        else:
            continue

        if lat is None or lon is None:
            continue

        tags = elem.get("tags", {})
        name = (
            tags.get("name")
            or tags.get("name:en")
            or tags.get("ref")
            or f"Unnamed {category.replace('_', ' ').title()}"
        )

        results.append(
            {
                "id": osm_id,
                "name": name,
                "category": category,
                "lat": lat,
                "lon": lon,
            }
        )

    return results
