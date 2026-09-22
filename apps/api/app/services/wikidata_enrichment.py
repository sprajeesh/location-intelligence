import logging

from app.clients.wikidata import WikidataClient
from app.models.domain import Facility
from app.repositories.cache import CacheRepository

logger = logging.getLogger(__name__)

# Wikidata facts (description/website/image) change slowly -- cache
# generously to avoid re-querying the same QID on every search that happens
# to pass near the same facility.
WIKIDATA_TTL = 60 * 60 * 24 * 30  # 30 days


def _cache_key(qid: str) -> str:
    return f"wikidata:{qid}"


class WikidataEnrichmentService:
    """Best-effort enrichment: adds description/website/image to the
    `details` dict of any facility whose OSM tags carried a wikidata=Qxxxx
    reference (captured as details["wikidataId"] by the Overpass client).

    Failures here never affect the core /location/analyze response --
    unlike Overpass/OSRM, this is decorative detail, not scoring input, so
    an outage is logged and swallowed rather than surfaced as a warning.
    """

    def __init__(self, client: WikidataClient, cache: CacheRepository) -> None:
        self._client = client
        self._cache = cache

    async def enrich(self, facilities: list[Facility]) -> None:
        facilities_by_qid: dict[str, list[Facility]] = {}
        for facility in facilities:
            qid = (facility.details or {}).get("wikidataId")
            if qid:
                facilities_by_qid.setdefault(qid, []).append(facility)

        if not facilities_by_qid:
            return

        entities: dict[str, dict[str, str]] = {}
        missing_qids: list[str] = []
        for qid in facilities_by_qid:
            cached = await self._cache.get(_cache_key(qid))
            if cached is not None:
                entities[qid] = cached
            else:
                missing_qids.append(qid)

        if missing_qids:
            try:
                fetched = await self._client.fetch_entities(missing_qids)
            except Exception as exc:
                logger.warning("Wikidata enrichment failed for %d QIDs: %s", len(missing_qids), exc)
                fetched = {}

            for qid in missing_qids:
                entity = fetched.get(qid, {})
                entities[qid] = entity
                await self._cache.set(_cache_key(qid), entity, WIKIDATA_TTL)

        for qid, facility_list in facilities_by_qid.items():
            entity = entities.get(qid)
            if not entity:
                continue
            for facility in facility_list:
                # facility.details is guaranteed non-None here -- it's how
                # this facility's QID was found above.
                details = facility.details
                assert details is not None
                if "description" in entity and "description" not in details:
                    details["description"] = entity["description"]
                if "image" in entity and "image" not in details:
                    details["image"] = entity["image"]
                # OSM's own website tag (if present) wins -- Wikidata's is
                # only a fallback for facilities OSM didn't tag with one.
                if "website" in entity and "website" not in details:
                    details["website"] = entity["website"]
