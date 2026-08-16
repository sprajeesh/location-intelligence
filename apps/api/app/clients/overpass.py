import asyncio
import logging
import random
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import httpx

from app.clients.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

DEFAULT_MAX_CONCURRENCY = 2  # overpass-api.de tolerates ~2 concurrent slots/IP
DEFAULT_RETRY_AFTER_WAIT = 5.0  # seconds, used when a 429 has no Retry-After header

# Overpass's fair-use policy asks for a User-Agent/Referer that uniquely
# identifies the app and lets the operator reach us if it causes trouble --
# see https://wiki.openstreetmap.org/wiki/Overpass_API#Introduction.
APP_IDENTITY_URL = "https://github.com/sprajeesh/location-intelligence"
USER_AGENT = f"LocationIntelligence/1.0 (+{APP_IDENTITY_URL})"

CategorySpec = tuple[str, list[tuple[str, str]], int]  # (category, tags, radius_m)


def _build_merged_query(specs: list[CategorySpec], lat: float, lon: float) -> str:
    """Build a single OverpassQL query covering multiple categories.

    Categories can have different radii (see scoring_config.fetch_radius_km), so
    each tag gets its own `around:` clause. Uses `nwr[...]` (one statement for
    node+way+relation) instead of separate node/way lines to shrink query size.
    """
    lines = []
    for _category, tags, radius_m in specs:
        for key, value in tags:
            lines.append(f'  nwr["{key}"="{value}"](around:{radius_m},{lat},{lon});')

    inner = "\n".join(lines)
    return f"[out:json][timeout:25];\n(\n{inner}\n);\nout center;"


def _parse_retry_after(value: str | None) -> float | None:
    """Parse a Retry-After header value (RFC 7231): either delay-seconds or an HTTP-date."""
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        pass

    try:
        retry_at = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if retry_at.tzinfo is None:
        retry_at = retry_at.replace(tzinfo=UTC)

    return max(0.0, (retry_at - datetime.now(UTC)).total_seconds())


def _categorize(
    tags: dict[str, str], tag_to_category: dict[tuple[str, str], list[str]]
) -> list[str]:
    """All unique categories matched by an element's tags, in first-seen order.

    An element can legitimately match more than one requested category — e.g. a
    node tagged both `amenity=school` and `leisure=park` — so every match is
    kept rather than only the first.
    """
    categories: list[str] = []
    for pair in tags.items():
        for category in tag_to_category.get(pair, ()):
            if category not in categories:
                categories.append(category)
    return categories


def _parse_merged_elements(
    elements: list[dict], tag_to_category: dict[tuple[str, str], list[str]]
) -> dict[str, list[dict]]:
    """Parse a merged Overpass response into {category: [facility_dict, ...]}.

    An element matching multiple categories is included once per category,
    deduplicated by (category, id) — mirroring FacilitiesService's own dedup
    key — rather than by id alone, so it isn't dropped from every category but
    the first it was seen in.
    """
    results: dict[str, list[dict]] = {}
    seen: set[tuple[str, str]] = set()

    for elem in elements:
        elem_type = elem.get("type", "")
        elem_id = elem.get("id")
        if elem_id is None:
            continue

        osm_id = f"osm_{elem_type}_{elem_id}"

        # Get coordinates — for ways/relations use center
        if elem_type == "node":
            lat = elem.get("lat")
            lon = elem.get("lon")
        elif elem_type in ("way", "relation"):
            center = elem.get("center", {})
            lat = center.get("lat")
            lon = center.get("lon")
        else:
            continue

        if lat is None or lon is None:
            continue

        tags = elem.get("tags", {})
        categories = _categorize(tags, tag_to_category)
        if not categories:
            logger.warning("Overpass element %s matched no known category tag; skipping", osm_id)
            continue

        base_name = tags.get("name") or tags.get("name:en") or tags.get("ref")

        for category in categories:
            key = (category, osm_id)
            if key in seen:
                continue
            seen.add(key)

            name = base_name or f"Unnamed {category.replace('_', ' ').title()}"
            results.setdefault(category, []).append(
                {
                    "id": osm_id,
                    "name": name,
                    "category": category,
                    "lat": lat,
                    "lon": lon,
                }
            )

    return results


class OverpassClient:
    def __init__(
        self,
        base_url: str,
        http_client: httpx.AsyncClient,
        category_tags: dict[str, list[tuple[str, str]]],
        *,
        max_concurrency: int = DEFAULT_MAX_CONCURRENCY,
        breaker: CircuitBreaker | None = None,
    ) -> None:
        if max_concurrency < 1:
            raise ValueError(f"max_concurrency must be >= 1, got {max_concurrency}")

        self._base_url = base_url.rstrip("/")
        self._http = http_client
        self._category_tags = category_tags
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._breaker = breaker

    async def fetch_categories(
        self,
        specs: list[CategorySpec],
        lat: float,
        lon: float,
        retries: int = 2,
    ) -> dict[str, list[dict]]:
        """Fetch multiple categories via one merged Overpass query.

        Returns {category: [facility_dict, ...]} for every category in `specs`,
        including categories with zero matches (empty list). Raises on final
        failure — every category in `specs` fails together, since it's one
        HTTP call (callers bound the blast radius via batch size).
        """
        if not specs:
            return {}

        tag_to_category: dict[tuple[str, str], list[str]] = {}
        for category, tags, _radius_m in specs:
            for pair in tags:
                categories = tag_to_category.setdefault(pair, [])
                if category not in categories:
                    categories.append(category)

        query = _build_merged_query(specs, lat, lon)
        label = ",".join(category for category, _tags, _radius_m in specs)

        if self._breaker is not None:
            elements = await self._breaker.call(
                lambda: self._post_with_retry(query, retries, label)
            )
        else:
            elements = await self._post_with_retry(query, retries, label)

        parsed = _parse_merged_elements(elements, tag_to_category)
        return {category: parsed.get(category, []) for category, _tags, _radius_m in specs}

    async def _post_with_retry(self, query: str, retries: int, label: str) -> list[dict]:
        last_exc: Exception | None = None
        for attempt in range(retries + 1):
            wait: float = 0.0
            async with self._semaphore:
                try:
                    response = await self._http.post(
                        self._base_url,
                        content=query,
                        headers={
                            "Content-Type": "text/plain",
                            "Accept": "application/json",
                            "User-Agent": USER_AGENT,
                            "Referer": APP_IDENTITY_URL,
                        },
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    return data.get("elements", [])
                except httpx.HTTPStatusError as exc:
                    last_exc = exc
                    if exc.response.status_code == 429:
                        retry_after = _parse_retry_after(exc.response.headers.get("Retry-After"))
                        wait = retry_after if retry_after is not None else DEFAULT_RETRY_AFTER_WAIT
                    else:
                        wait = 2**attempt + random.uniform(0, 0.5)
                except Exception as exc:
                    last_exc = exc
                    wait = 2**attempt + random.uniform(0, 0.5)

            if attempt < retries:
                logger.warning(
                    "Overpass attempt %d failed for [%s], retrying in %.1fs: %s",
                    attempt + 1,
                    label,
                    wait,
                    last_exc,
                )
                await asyncio.sleep(wait)

        raise RuntimeError(f"Overpass query failed for categories [{label}]") from last_exc
