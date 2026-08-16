"""Tests for the merged-query Overpass client (app/clients/overpass.py)."""

import asyncio
from datetime import UTC, datetime, timedelta
from email.utils import format_datetime
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.clients.circuit_breaker import CircuitBreaker, CircuitOpenError
from app.clients.overpass import (
    OverpassClient,
    _build_merged_query,
    _parse_merged_elements,
    _parse_retry_after,
)


def _response(status_code: int, json_data: dict | None = None, headers: dict | None = None):
    request = httpx.Request("POST", "http://mock-overpass")
    response = httpx.Response(
        status_code=status_code,
        json=json_data or {},
        headers=headers or {},
        request=request,
    )
    return response


class TestBuildMergedQuery:
    def test_uses_nwr_not_node_way(self) -> None:
        specs = [
            ("schools", [("amenity", "school")], 3000),
            ("supermarkets", [("shop", "supermarket")], 10000),
        ]
        query = _build_merged_query(specs, -36.848, 174.763)

        assert 'nwr["amenity"="school"](around:3000,-36.848,174.763);' in query
        assert 'nwr["shop"="supermarket"](around:10000,-36.848,174.763);' in query
        assert "node[" not in query
        assert "way[" not in query

    def test_multiple_tags_same_category_each_get_own_line(self) -> None:
        specs = [("bus_stops", [("highway", "bus_stop"), ("public_transport", "platform")], 1200)]
        query = _build_merged_query(specs, -36.848, 174.763)

        assert 'nwr["highway"="bus_stop"](around:1200,-36.848,174.763);' in query
        assert 'nwr["public_transport"="platform"](around:1200,-36.848,174.763);' in query


class TestParseMergedElements:
    def test_splits_by_category_including_relations(self) -> None:
        tag_to_category = {
            ("amenity", "school"): ["schools"],
            ("leisure", "park"): ["parks"],
        }
        elements = [
            {
                "type": "node",
                "id": 1,
                "lat": -36.8,
                "lon": 174.7,
                "tags": {"amenity": "school", "name": "Test School"},
            },
            {
                "type": "way",
                "id": 2,
                "center": {"lat": -36.81, "lon": 174.71},
                "tags": {"leisure": "park", "name": "Test Park"},
            },
            {
                "type": "relation",
                "id": 3,
                "center": {"lat": -36.82, "lon": 174.72},
                "tags": {"leisure": "park", "name": "Multipolygon Park"},
            },
        ]

        result = _parse_merged_elements(elements, tag_to_category)

        assert {f["id"] for f in result["schools"]} == {"osm_node_1"}
        assert {f["id"] for f in result["parks"]} == {"osm_way_2", "osm_relation_3"}
        assert result["parks"][1]["lat"] == -36.82

    def test_unknown_tags_are_skipped(self) -> None:
        elements = [
            {"type": "node", "id": 1, "lat": -36.8, "lon": 174.7, "tags": {"amenity": "bar"}}
        ]
        result = _parse_merged_elements(elements, {("amenity", "school"): ["schools"]})
        assert result == {}

    def test_dedupes_by_type_and_id(self) -> None:
        tag_to_category = {("amenity", "school"): ["schools"]}
        elements = [
            {"type": "node", "id": 1, "lat": -36.8, "lon": 174.7, "tags": {"amenity": "school"}},
            {"type": "node", "id": 1, "lat": -36.8, "lon": 174.7, "tags": {"amenity": "school"}},
        ]
        result = _parse_merged_elements(elements, tag_to_category)
        assert len(result["schools"]) == 1

    def test_element_matching_two_categories_appears_in_both(self) -> None:
        """A node carrying tags for two different requested categories (e.g. a
        supermarket that's also tagged as a pharmacy) should be counted toward
        both, not just whichever category's tag pair happens to match first."""
        tag_to_category = {
            ("shop", "supermarket"): ["supermarkets"],
            ("amenity", "pharmacy"): ["pharmacies"],
        }
        elements = [
            {
                "type": "node",
                "id": 1,
                "lat": -36.8,
                "lon": 174.7,
                "tags": {
                    "shop": "supermarket",
                    "amenity": "pharmacy",
                    "name": "Supermarket with Pharmacy",
                },
            },
        ]

        result = _parse_merged_elements(elements, tag_to_category)

        assert {f["id"] for f in result["supermarkets"]} == {"osm_node_1"}
        assert {f["id"] for f in result["pharmacies"]} == {"osm_node_1"}
        assert result["supermarkets"][0]["name"] == "Supermarket with Pharmacy"
        assert result["pharmacies"][0]["name"] == "Supermarket with Pharmacy"


class TestParseRetryAfter:
    def test_delay_seconds(self) -> None:
        assert _parse_retry_after("3") == 3.0

    def test_none_for_missing_value(self) -> None:
        assert _parse_retry_after(None) is None
        assert _parse_retry_after("") is None

    def test_none_for_invalid_value(self) -> None:
        assert _parse_retry_after("not-a-date-or-number") is None

    def test_http_date_in_future(self) -> None:
        retry_at = datetime.now(UTC) + timedelta(seconds=120)
        result = _parse_retry_after(format_datetime(retry_at, usegmt=True))
        assert result is not None
        assert 118 <= result <= 120

    def test_http_date_in_past_clamped_to_zero(self) -> None:
        retry_at = datetime.now(UTC) - timedelta(hours=1)
        result = _parse_retry_after(format_datetime(retry_at, usegmt=True))
        assert result == 0.0


class TestOverpassClientInit:
    def test_rejects_zero_max_concurrency(self) -> None:
        """A semaphore built with 0 permits would never grant one, hanging every
        request forever, so this must fail fast at construction instead."""
        with pytest.raises(ValueError):
            OverpassClient("http://mock-overpass", MagicMock(), {}, max_concurrency=0)

    def test_rejects_negative_max_concurrency(self) -> None:
        with pytest.raises(ValueError):
            OverpassClient("http://mock-overpass", MagicMock(), {}, max_concurrency=-1)

    def test_accepts_valid_max_concurrency(self) -> None:
        OverpassClient("http://mock-overpass", MagicMock(), {}, max_concurrency=1)


class TestFetchCategories:
    async def test_single_http_call_for_multiple_categories(self) -> None:
        mock_http = MagicMock()
        mock_http.post = AsyncMock(
            return_value=_response(
                200,
                {
                    "elements": [
                        {
                            "type": "node",
                            "id": 1,
                            "lat": -36.8,
                            "lon": 174.7,
                            "tags": {"amenity": "school"},
                        }
                    ]
                },
            )
        )
        client = OverpassClient("http://mock-overpass", mock_http, {})

        specs = [
            ("schools", [("amenity", "school")], 3000),
            ("supermarkets", [("shop", "supermarket")], 10000),
        ]
        result = await client.fetch_categories(specs, -36.848, 174.763)

        assert mock_http.post.call_count == 1
        assert len(result["schools"]) == 1
        assert result["supermarkets"] == []

    async def test_empty_specs_returns_empty_without_http_call(self) -> None:
        mock_http = MagicMock()
        mock_http.post = AsyncMock()
        client = OverpassClient("http://mock-overpass", mock_http, {})

        result = await client.fetch_categories([], -36.848, 174.763)

        assert result == {}
        mock_http.post.assert_not_called()

    async def test_429_honors_retry_after_header(self) -> None:
        mock_http = MagicMock()
        error_response = _response(429, {}, headers={"Retry-After": "3"})
        error = httpx.HTTPStatusError(
            "rate limited", request=error_response.request, response=error_response
        )
        mock_http.post = AsyncMock(side_effect=[error, _response(200, {"elements": []})])
        client = OverpassClient("http://mock-overpass", mock_http, {})
        specs = [("schools", [("amenity", "school")], 3000)]

        with patch("app.clients.overpass.asyncio.sleep", new=AsyncMock()) as mock_sleep:
            await client.fetch_categories(specs, -36.848, 174.763)

        mock_sleep.assert_awaited_once_with(3.0)

    async def test_429_without_header_uses_default_wait(self) -> None:
        mock_http = MagicMock()
        error_response = _response(429, {})
        error = httpx.HTTPStatusError(
            "rate limited", request=error_response.request, response=error_response
        )
        mock_http.post = AsyncMock(side_effect=[error, _response(200, {"elements": []})])
        client = OverpassClient("http://mock-overpass", mock_http, {})
        specs = [("schools", [("amenity", "school")], 3000)]

        with patch("app.clients.overpass.asyncio.sleep", new=AsyncMock()) as mock_sleep:
            await client.fetch_categories(specs, -36.848, 174.763)

        mock_sleep.assert_awaited_once_with(5.0)

    async def test_5xx_backoff_has_jitter(self) -> None:
        mock_http = MagicMock()
        error_response = _response(500, {})
        error = httpx.HTTPStatusError(
            "server error", request=error_response.request, response=error_response
        )
        mock_http.post = AsyncMock(side_effect=[error, error, _response(200, {"elements": []})])
        client = OverpassClient("http://mock-overpass", mock_http, {})
        specs = [("schools", [("amenity", "school")], 3000)]

        with (
            patch("app.clients.overpass.asyncio.sleep", new=AsyncMock()) as mock_sleep,
            patch("app.clients.overpass.random.uniform", return_value=0.25),
        ):
            await client.fetch_categories(specs, -36.848, 174.763)

        assert mock_sleep.await_args_list[0].args[0] == pytest.approx(1.25)  # 2**0 + 0.25
        assert mock_sleep.await_args_list[1].args[0] == pytest.approx(2.25)  # 2**1 + 0.25

    async def test_bounds_concurrency(self) -> None:
        client = OverpassClient("http://mock-overpass", MagicMock(), {}, max_concurrency=1)
        in_flight = 0
        max_in_flight = 0

        async def slow_post(*_args, **_kwargs):
            nonlocal in_flight, max_in_flight
            in_flight += 1
            max_in_flight = max(max_in_flight, in_flight)
            await asyncio.sleep(0.05)
            in_flight -= 1
            return _response(200, {"elements": []})

        client._http.post = AsyncMock(side_effect=slow_post)

        await asyncio.gather(
            *(
                client.fetch_categories([("schools", [("amenity", "school")], 3000)], -36.8, 174.7)
                for _ in range(3)
            )
        )

        assert max_in_flight == 1

    async def test_raises_after_exhausting_retries(self) -> None:
        mock_http = MagicMock()
        mock_http.post = AsyncMock(side_effect=RuntimeError("boom"))
        client = OverpassClient("http://mock-overpass", mock_http, {})

        with patch("app.clients.overpass.asyncio.sleep", new=AsyncMock()):
            with pytest.raises(RuntimeError, match="Overpass query failed"):
                await client.fetch_categories(
                    [("schools", [("amenity", "school")], 3000)], -36.848, 174.763, retries=2
                )

        assert mock_http.post.call_count == 3


class TestCircuitBreakerIntegration:
    async def test_breaker_counts_one_failure_per_call_not_per_retry_attempt(self) -> None:
        """The breaker wraps the whole fetch_categories call (with its own
        internal retries), so retries=2 (3 HTTP attempts) inside one failing
        call must only count as a single breaker failure -- not three."""
        mock_http = MagicMock()
        mock_http.post = AsyncMock(side_effect=RuntimeError("boom"))
        breaker = CircuitBreaker("overpass", failure_threshold=2, cooldown_seconds=30.0)
        client = OverpassClient("http://mock-overpass", mock_http, {}, breaker=breaker)

        with patch("app.clients.overpass.asyncio.sleep", new=AsyncMock()):
            with pytest.raises(RuntimeError, match="Overpass query failed"):
                await client.fetch_categories(
                    [("schools", [("amenity", "school")], 3000)], -36.848, 174.763, retries=2
                )

        assert mock_http.post.call_count == 3  # all 3 retry attempts ran
        assert not breaker.is_open  # but only counted as 1 of 2 needed failures

        with patch("app.clients.overpass.asyncio.sleep", new=AsyncMock()):
            with pytest.raises(RuntimeError, match="Overpass query failed"):
                await client.fetch_categories(
                    [("schools", [("amenity", "school")], 3000)], -36.848, 174.763, retries=2
                )

        assert breaker.is_open  # 2nd whole-call failure opens it

    async def test_breaker_open_skips_http_entirely(self) -> None:
        breaker = CircuitBreaker("overpass", failure_threshold=1, cooldown_seconds=30.0)
        breaker.record_failure()
        assert breaker.is_open

        mock_http = MagicMock()
        mock_http.post = AsyncMock()
        client = OverpassClient("http://mock-overpass", mock_http, {}, breaker=breaker)

        with pytest.raises(CircuitOpenError):
            await client.fetch_categories(
                [("schools", [("amenity", "school")], 3000)], -36.848, 174.763
            )

        mock_http.post.assert_not_called()
