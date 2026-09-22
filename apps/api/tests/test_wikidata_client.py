"""Tests for the Wikidata Query Service client (app/clients/wikidata.py)."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.clients.circuit_breaker import CircuitBreaker, CircuitOpenError
from app.clients.wikidata import WikidataClient, _build_sparql_query, _parse_bindings


def _response(json_data: dict):
    request = httpx.Request("GET", "http://mock-wikidata")
    return httpx.Response(status_code=200, json=json_data, request=request)


class TestBuildSparqlQuery:
    def test_includes_every_qid_in_values_clause(self) -> None:
        query = _build_sparql_query(["Q1", "Q2"])
        assert "wd:Q1" in query
        assert "wd:Q2" in query
        assert "VALUES ?item" in query

    def test_requests_website_image_and_english_description(self) -> None:
        query = _build_sparql_query(["Q1"])
        assert "wdt:P856" in query  # official website
        assert "wdt:P18" in query  # image
        assert 'LANG(?description) = "en"' in query


class TestParseBindings:
    def test_merges_multiple_rows_for_the_same_qid(self) -> None:
        """OPTIONAL clauses can each produce their own result row per ?item,
        so a website-only row and an image-only row for the same QID must
        merge into one entity, not overwrite each other."""
        bindings = [
            {
                "item": {"value": "http://www.wikidata.org/entity/Q1"},
                "website": {"value": "https://example.org"},
            },
            {
                "item": {"value": "http://www.wikidata.org/entity/Q1"},
                "image": {"value": "https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg"},
            },
        ]
        result = _parse_bindings(bindings)
        assert result == {
            "Q1": {
                "website": "https://example.org",
                "image": "https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg",
            }
        }

    def test_ignores_rows_with_no_recognized_fields(self) -> None:
        bindings = [{"item": {"value": "http://www.wikidata.org/entity/Q1"}}]
        assert _parse_bindings(bindings) == {"Q1": {}}

    def test_ignores_rows_missing_the_item_binding(self) -> None:
        assert _parse_bindings([{"website": {"value": "https://example.org"}}]) == {}


class TestWikidataClientInit:
    def test_rejects_non_positive_max_concurrency(self) -> None:
        with pytest.raises(ValueError):
            WikidataClient("http://mock-wikidata", MagicMock(), max_concurrency=0)


class TestFetchEntities:
    async def test_empty_qids_returns_empty_without_http_call(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock()
        client = WikidataClient("http://mock-wikidata", mock_http)

        result = await client.fetch_entities([])

        assert result == {}
        mock_http.get.assert_not_called()

    async def test_single_request_for_multiple_qids(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock(
            return_value=_response(
                {
                    "results": {
                        "bindings": [
                            {
                                "item": {"value": "http://www.wikidata.org/entity/Q1"},
                                "description": {"value": "a school"},
                            }
                        ]
                    }
                }
            )
        )
        client = WikidataClient("http://mock-wikidata", mock_http)

        result = await client.fetch_entities(["Q1", "Q2"])

        assert mock_http.get.call_count == 1
        assert result == {"Q1": {"description": "a school"}}

    async def test_breaker_open_skips_http_entirely(self) -> None:
        breaker = CircuitBreaker("wikidata", failure_threshold=1, cooldown_seconds=30.0)
        breaker.record_failure()
        assert breaker.is_open

        mock_http = MagicMock()
        mock_http.get = AsyncMock()
        client = WikidataClient("http://mock-wikidata", mock_http, breaker=breaker)

        with pytest.raises(CircuitOpenError):
            await client.fetch_entities(["Q1"])

        mock_http.get.assert_not_called()
