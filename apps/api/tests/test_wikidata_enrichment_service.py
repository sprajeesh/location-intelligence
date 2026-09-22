"""Tests for WikidataEnrichmentService (app/services/wikidata_enrichment.py)."""

from unittest.mock import AsyncMock, MagicMock

from app.clients.wikidata import WikidataClient
from app.models.domain import Facility
from app.repositories.cache import CacheRepository
from app.services.wikidata_enrichment import WikidataEnrichmentService


def _facility(id_: str, wikidata_id: str | None, **extra_details: str) -> Facility:
    details = {**extra_details}
    if wikidata_id:
        details["wikidataId"] = wikidata_id
    return Facility(id=id_, name=id_, category="schools", lat=-36.8, lon=174.7, details=details)


class TestEnrich:
    async def test_skips_facilities_without_a_wikidata_id(self) -> None:
        client = MagicMock(spec=WikidataClient)
        client.fetch_entities = AsyncMock(return_value={})
        cache = CacheRepository(client=None)
        service = WikidataEnrichmentService(client, cache)

        facility = _facility("f1", None)
        await service.enrich([facility])

        client.fetch_entities.assert_not_called()
        assert facility.details == {}

    async def test_merges_description_image_and_fallback_website(self) -> None:
        client = MagicMock(spec=WikidataClient)
        client.fetch_entities = AsyncMock(
            return_value={
                "Q1": {
                    "description": "a school",
                    "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg",
                    "website": "https://wikidata-website.example",
                }
            }
        )
        cache = CacheRepository(client=None)
        service = WikidataEnrichmentService(client, cache)

        facility = _facility("f1", "Q1")
        await service.enrich([facility])

        assert facility.details == {
            "wikidataId": "Q1",
            "description": "a school",
            "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg",
            "website": "https://wikidata-website.example",
        }

    async def test_osm_website_wins_over_wikidata_fallback(self) -> None:
        client = MagicMock(spec=WikidataClient)
        client.fetch_entities = AsyncMock(
            return_value={"Q1": {"website": "https://wikidata-website.example"}}
        )
        cache = CacheRepository(client=None)
        service = WikidataEnrichmentService(client, cache)

        facility = _facility("f1", "Q1", website="https://osm-website.example")
        await service.enrich([facility])

        assert facility.details["website"] == "https://osm-website.example"

    async def test_dedupes_a_shared_qid_into_one_fetch_call(self) -> None:
        client = MagicMock(spec=WikidataClient)
        client.fetch_entities = AsyncMock(return_value={"Q1": {"description": "shared"}})
        cache = CacheRepository(client=None)
        service = WikidataEnrichmentService(client, cache)

        f1 = _facility("f1", "Q1")
        f2 = _facility("f2", "Q1")
        await service.enrich([f1, f2])

        client.fetch_entities.assert_awaited_once_with(["Q1"])
        assert f1.details["description"] == "shared"
        assert f2.details["description"] == "shared"

    async def test_cache_hit_skips_the_client_call(self) -> None:
        client = MagicMock(spec=WikidataClient)
        client.fetch_entities = AsyncMock()
        cache = MagicMock(spec=CacheRepository)
        cache.get = AsyncMock(return_value={"description": "cached"})
        cache.set = AsyncMock()
        service = WikidataEnrichmentService(client, cache)

        facility = _facility("f1", "Q1")
        await service.enrich([facility])

        client.fetch_entities.assert_not_called()
        assert facility.details["description"] == "cached"

    async def test_client_failure_is_swallowed_not_raised(self) -> None:
        client = MagicMock(spec=WikidataClient)
        client.fetch_entities = AsyncMock(side_effect=RuntimeError("boom"))
        cache = CacheRepository(client=None)
        service = WikidataEnrichmentService(client, cache)

        facility = _facility("f1", "Q1")
        await service.enrich([facility])  # must not raise

        assert facility.details == {"wikidataId": "Q1"}
