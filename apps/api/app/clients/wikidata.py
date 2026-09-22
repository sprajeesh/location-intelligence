import asyncio
import logging

import httpx

from app.clients.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

DEFAULT_MAX_CONCURRENCY = 2  # be polite -- see Wikidata:SPARQL_query_service/query_limits

# Identifies this app to the Wikidata Query Service per its etiquette guidance
# (https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_limits) --
# same rationale as Overpass's fair-use User-Agent, see app/clients/overpass.py.
APP_IDENTITY_URL = "https://github.com/sprajeesh/location-intelligence"
USER_AGENT = f"LocationIntelligence/1.0 (+{APP_IDENTITY_URL})"

_ENTITY_URI_PREFIX = "http://www.wikidata.org/entity/"


def _build_sparql_query(qids: list[str]) -> str:
    values = " ".join(f"wd:{qid}" for qid in qids)
    return f"""
SELECT ?item ?website ?image ?description WHERE {{
  VALUES ?item {{ {values} }}
  OPTIONAL {{ ?item wdt:P856 ?website. }}
  OPTIONAL {{ ?item wdt:P18 ?image. }}
  OPTIONAL {{
    ?item schema:description ?description.
    FILTER(LANG(?description) = "en")
  }}
}}
""".strip()


def _qid_from_uri(uri: str) -> str | None:
    if not uri.startswith(_ENTITY_URI_PREFIX):
        return None
    return uri[len(_ENTITY_URI_PREFIX) :]


def _parse_bindings(bindings: list[dict]) -> dict[str, dict[str, str]]:
    """SPARQL's OPTIONAL clauses can each produce a separate result row per
    ?item when a property has no match for one of them, so merge by QID
    rather than assuming one row per entity."""
    entities: dict[str, dict[str, str]] = {}
    for binding in bindings:
        item_uri = binding.get("item", {}).get("value")
        if not item_uri:
            continue
        qid = _qid_from_uri(item_uri)
        if qid is None:
            continue

        details = entities.setdefault(qid, {})
        website = binding.get("website", {}).get("value")
        if website and "website" not in details:
            details["website"] = website
        # P18 (image) comes back from the SPARQL endpoint as a ready-to-use
        # Special:FilePath URL already (commonsMedia properties are exposed
        # this way), so no extra resolution step is needed here.
        image = binding.get("image", {}).get("value")
        if image and "image" not in details:
            details["image"] = image
        description = binding.get("description", {}).get("value")
        if description and "description" not in details:
            details["description"] = description

    return entities


class WikidataClient:
    """Client for the public Wikidata Query Service SPARQL endpoint.

    No API key -- free, CC0, rate-limited by IP (see query_limits doc linked
    above). Used to enrich facilities whose OSM tags carry a wikidata=Qxxxx
    reference (see app/services/wikidata_enrichment.py).
    """

    def __init__(
        self,
        base_url: str,
        http_client: httpx.AsyncClient,
        *,
        max_concurrency: int = DEFAULT_MAX_CONCURRENCY,
        breaker: CircuitBreaker | None = None,
    ) -> None:
        if max_concurrency < 1:
            raise ValueError(f"max_concurrency must be >= 1, got {max_concurrency}")

        self._base_url = base_url
        self._http = http_client
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._breaker = breaker

    async def fetch_entities(self, qids: list[str]) -> dict[str, dict[str, str]]:
        """Batch-fetch website/image/description for a list of QIDs in one
        SPARQL request. Returns {qid: {field: value, ...}, ...} -- a QID with
        no matched fields at all is simply absent from the result, not an
        empty dict, so callers can tell "no data" from "nothing found"."""
        if not qids:
            return {}

        if self._breaker is not None:
            return await self._breaker.call(lambda: self._query(qids))
        return await self._query(qids)

    async def _query(self, qids: list[str]) -> dict[str, dict[str, str]]:
        query = _build_sparql_query(qids)
        async with self._semaphore:
            response = await self._http.get(
                self._base_url,
                params={"query": query, "format": "json"},
                headers={"Accept": "application/sparql-results+json", "User-Agent": USER_AGENT},
                timeout=15.0,
            )
        response.raise_for_status()
        data = response.json()
        bindings = data.get("results", {}).get("bindings", [])
        return _parse_bindings(bindings)
