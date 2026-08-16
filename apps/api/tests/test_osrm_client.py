"""Tests for the OSRM table-distance client (app/clients/osrm.py)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.clients.circuit_breaker import CircuitBreaker
from app.clients.osrm import OSRMClient, haversine_km


def _table_response(distances: list[list[float | None]]):
    request = httpx.Request("GET", "http://mock-osrm")
    return httpx.Response(status_code=200, json={"distances": distances}, request=request)


class TestOSRMClientInit:
    def test_rejects_zero_max_concurrency(self) -> None:
        with pytest.raises(ValueError):
            OSRMClient("http://mock-osrm", MagicMock(), max_concurrency=0)

    def test_rejects_negative_max_concurrency(self) -> None:
        with pytest.raises(ValueError):
            OSRMClient("http://mock-osrm", MagicMock(), max_concurrency=-1)

    def test_accepts_valid_max_concurrency(self) -> None:
        OSRMClient("http://mock-osrm", MagicMock(), max_concurrency=1)


class TestTableDistancesKm:
    async def test_empty_destinations_returns_immediately(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock()
        client = OSRMClient("http://mock-osrm", mock_http)

        distances, used_fallback = await client.table_distances_km(-36.8, 174.7, [])

        assert distances == []
        assert used_fallback is False
        mock_http.get.assert_not_called()

    async def test_successful_call_returns_real_distances(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock(return_value=_table_response([[None, 2500.0]]))
        client = OSRMClient("http://mock-osrm", mock_http)

        destinations = [(-36.81, 174.71), (-36.82, 174.72)]
        distances, used_fallback = await client.table_distances_km(-36.8, 174.7, destinations)

        assert len(distances) == 2
        assert distances[1] == pytest.approx(2.5)
        assert used_fallback is True  # first destination was unreachable (None)

    async def test_connect_error_falls_back_to_haversine(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock(side_effect=httpx.ConnectError("boom"))
        client = OSRMClient("http://mock-osrm", mock_http)

        destinations = [(-36.81, 174.71)]
        distances, used_fallback = await client.table_distances_km(-36.8, 174.7, destinations)

        assert used_fallback is True
        assert distances[0] == pytest.approx(haversine_km(-36.8, 174.7, -36.81, 174.71))

    async def test_breaker_open_skips_http_call_entirely(self) -> None:
        breaker = CircuitBreaker("osrm", failure_threshold=1, cooldown_seconds=30.0)
        breaker.record_failure()  # opens on the very first failure
        assert breaker.is_open

        mock_http = MagicMock()
        mock_http.get = AsyncMock()
        client = OSRMClient("http://mock-osrm", mock_http, breaker=breaker)

        destinations = [(-36.81, 174.71)]
        distances, used_fallback = await client.table_distances_km(-36.8, 174.7, destinations)

        assert used_fallback is True
        assert distances[0] == pytest.approx(haversine_km(-36.8, 174.7, -36.81, 174.71))
        mock_http.get.assert_not_called()

    @pytest.mark.parametrize(
        "exc",
        [
            httpx.ConnectError("boom"),
            httpx.TimeoutException("boom"),
            httpx.RemoteProtocolError("boom"),
        ],
    )
    async def test_each_transport_error_records_a_breaker_failure(self, exc: Exception) -> None:
        breaker = CircuitBreaker("osrm", failure_threshold=1, cooldown_seconds=30.0)
        mock_http = MagicMock()
        mock_http.get = AsyncMock(side_effect=exc)
        client = OSRMClient("http://mock-osrm", mock_http, breaker=breaker)

        await client.table_distances_km(-36.8, 174.7, [(-36.81, 174.71)])

        assert breaker.is_open

    async def test_success_records_breaker_success(self) -> None:
        breaker = CircuitBreaker("osrm", failure_threshold=1, cooldown_seconds=30.0)
        mock_http = MagicMock()
        mock_http.get = AsyncMock(return_value=_table_response([[1000.0]]))
        client = OSRMClient("http://mock-osrm", mock_http, breaker=breaker)

        await client.table_distances_km(-36.8, 174.7, [(-36.81, 174.71)])

        assert not breaker.is_open

    async def test_bounds_concurrency(self) -> None:
        client = OSRMClient("http://mock-osrm", MagicMock(), max_concurrency=1)
        in_flight = 0
        max_in_flight = 0

        async def slow_get(*_args, **_kwargs):
            nonlocal in_flight, max_in_flight
            in_flight += 1
            max_in_flight = max(max_in_flight, in_flight)
            await asyncio.sleep(0.05)
            in_flight -= 1
            return _table_response([[1000.0]])

        client._http.get = AsyncMock(side_effect=slow_get)

        await asyncio.gather(
            *(client.table_distances_km(-36.8, 174.7, [(-36.81, 174.71)]) for _ in range(3))
        )

        assert max_in_flight == 1
