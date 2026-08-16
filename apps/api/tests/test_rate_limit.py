"""Tests for the fastapi-limiter integration (app/api/rate_limit.py).

Every other fixture in this suite runs with Redis unreachable (no Redis
service in CI), so FastAPILimiter.redis stays None and rate limiting is a
no-op everywhere else. This file is the one place that actually exercises
enforcement, using fakeredis so the real Lua-script-based limiter runs
end-to-end without a real Redis server.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis as fakeredis
import pytest
from fastapi.testclient import TestClient
from fastapi_limiter import FastAPILimiter

from app.api.rate_limit import bff_client_identifier, rate_limit_exceeded
from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.main import create_app
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService
from tests.conftest import build_test_scoring_config


def _mock_address_repo() -> AddressRepository:
    repo = MagicMock(spec=AddressRepository)
    repo.search = AsyncMock(return_value=[])
    return repo


def _wire_test_state(application) -> None:
    cache = CacheRepository(client=None)
    mock_http = MagicMock()
    scoring_config = build_test_scoring_config()
    overpass = OverpassClient("http://mock-overpass", mock_http, scoring_config.category_tags)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    application.state.scoring_config = scoring_config
    application.state.geocoding_svc = GeocodingService(_mock_address_repo(), cache)
    application.state.facilities_svc = FacilitiesService(overpass, cache, scoring_config)
    application.state.distance_svc = DistanceService(osrm, cache, scoring_config.facility_configs)
    application.state.scoring_svc = LocationScoringService(
        scoring_config.facility_configs,
        scoring_config.category_facility_weights,
        scoring_config.category_weights,
    )


@pytest.fixture
async def fake_redis():
    client = fakeredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


@pytest.fixture
async def rate_limited_client(fake_redis):
    """A TestClient with FastAPILimiter backed by a real (fake) Redis, so
    rate limiting is actually enforced.

    FastAPILimiter.redis is a class-level attribute shared across the whole
    pytest run, so it's explicitly reset to None in teardown -- otherwise
    every other test module's TestClient (which relies on
    `FastAPILimiter.redis is None` to skip rate limiting) would get polluted
    by whatever this fixture leaves behind.
    """
    await FastAPILimiter.init(
        fake_redis, identifier=bff_client_identifier, http_callback=rate_limit_exceeded
    )

    application = create_app()
    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
        patch(
            "app.main.load_scoring_config",
            new=AsyncMock(return_value=build_test_scoring_config()),
        ),
    ):
        with TestClient(application) as client:
            _wire_test_state(application)
            yield client

    FastAPILimiter.redis = None


def _analyze_body() -> dict:
    return {"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": ["schools"]}


class TestRateLimitEnforced:
    def test_requests_within_limit_all_succeed(self, rate_limited_client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            for _ in range(10):  # default rate_limit_analyze_times
                response = rate_limited_client.post(
                    "/location/analyze",
                    json=_analyze_body(),
                    headers={"X-Forwarded-Client-Ip": "203.0.113.1"},
                )
                assert response.status_code != 429

    def test_request_over_limit_returns_429_with_retry_after(
        self, rate_limited_client: TestClient
    ) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            for _ in range(10):
                rate_limited_client.post(
                    "/location/analyze",
                    json=_analyze_body(),
                    headers={"X-Forwarded-Client-Ip": "203.0.113.2"},
                )
            response = rate_limited_client.post(
                "/location/analyze",
                json=_analyze_body(),
                headers={"X-Forwarded-Client-Ip": "203.0.113.2"},
            )

        assert response.status_code == 429
        assert "Retry-After" in response.headers

    def test_different_client_ips_are_tracked_independently(
        self, rate_limited_client: TestClient
    ) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            for _ in range(10):
                rate_limited_client.post(
                    "/location/analyze",
                    json=_analyze_body(),
                    headers={"X-Forwarded-Client-Ip": "203.0.113.3"},
                )
            exhausted_response = rate_limited_client.post(
                "/location/analyze",
                json=_analyze_body(),
                headers={"X-Forwarded-Client-Ip": "203.0.113.3"},
            )
            other_ip_response = rate_limited_client.post(
                "/location/analyze",
                json=_analyze_body(),
                headers={"X-Forwarded-Client-Ip": "203.0.113.4"},
            )

        assert exhausted_response.status_code == 429
        assert other_ip_response.status_code != 429

    def test_missing_header_falls_back_to_raw_client_ip_and_still_enforces(
        self, rate_limited_client: TestClient
    ) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            for _ in range(10):
                rate_limited_client.post("/location/analyze", json=_analyze_body())
            response = rate_limited_client.post("/location/analyze", json=_analyze_body())

        assert response.status_code == 429

    def test_analyze_and_search_limits_are_independent(
        self, rate_limited_client: TestClient
    ) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            for _ in range(10):
                rate_limited_client.post(
                    "/location/analyze",
                    json=_analyze_body(),
                    headers={"X-Forwarded-Client-Ip": "203.0.113.5"},
                )
            analyze_response = rate_limited_client.post(
                "/location/analyze",
                json=_analyze_body(),
                headers={"X-Forwarded-Client-Ip": "203.0.113.5"},
            )

        search_response = rate_limited_client.get(
            "/search/address?q=test", headers={"X-Forwarded-Client-Ip": "203.0.113.5"}
        )

        assert analyze_response.status_code == 429
        assert search_response.status_code != 429  # separate, much looser bucket


class TestRateLimitFailsOpen:
    """With FastAPILimiter.redis left None (the state every other fixture in
    this suite runs with, matching a real Redis outage), rate limiting must
    never turn into a hard failure -- see rate_limiter()'s fail-open wrapper."""

    def test_requests_past_the_configured_limit_still_succeed(
        self, test_client: TestClient
    ) -> None:
        assert FastAPILimiter.redis is None

        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            for _ in range(15):  # well past the default limit of 10
                response = test_client.post(
                    "/location/analyze",
                    json=_analyze_body(),
                    headers={"X-Forwarded-Client-Ip": "203.0.113.9"},
                )
                assert response.status_code == 200
