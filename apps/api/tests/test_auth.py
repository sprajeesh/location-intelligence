"""Tests for the X-Internal-Api-Key shared-secret guard (app/api/deps.py)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.config.settings import Settings, get_settings
from app.main import create_app
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService

SECRET = "test-shared-secret"


def _override_settings_with_secret() -> Settings:
    return Settings(
        database_url="postgresql://testuser:testpass@localhost/testdb",
        overpass_url="http://mock-overpass",
        osrm_url="http://mock-osrm",
        redis_url="redis://localhost:6379",
        api_shared_secret=SECRET,
    )


@pytest.fixture
def secured_client() -> TestClient:
    """Client with api_shared_secret configured, mirroring production."""
    application = create_app()
    application.dependency_overrides[get_settings] = _override_settings_with_secret

    cache = CacheRepository(client=None)
    mock_http = MagicMock()
    mock_addr_repo = MagicMock(spec=AddressRepository)
    mock_addr_repo.search = AsyncMock(return_value=[])
    overpass = OverpassClient("http://mock-overpass", mock_http)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
    ):
        with TestClient(application) as client:
            application.state.geocoding_svc = GeocodingService(mock_addr_repo, cache)
            application.state.facilities_svc = FacilitiesService(overpass, cache)
            application.state.distance_svc = DistanceService(osrm, cache)
            application.state.scoring_svc = LocationScoringService()
            yield client


class TestAuthEnforcedWhenConfigured:
    def test_missing_header_is_rejected(self, secured_client: TestClient) -> None:
        response = secured_client.get("/categories")
        assert response.status_code == 401

    def test_wrong_key_is_rejected(self, secured_client: TestClient) -> None:
        response = secured_client.get("/categories", headers={"X-Internal-Api-Key": "wrong"})
        assert response.status_code == 401

    def test_correct_key_is_accepted(self, secured_client: TestClient) -> None:
        response = secured_client.get("/categories", headers={"X-Internal-Api-Key": SECRET})
        assert response.status_code == 200

    def test_health_stays_unauthenticated(self, secured_client: TestClient) -> None:
        response = secured_client.get("/health")
        assert response.status_code == 200


class TestAuthSkippedWhenNotConfigured:
    """Default Settings() has api_shared_secret=None -- see tests/test_api.py's
    `client` fixture, which already exercises every route with zero headers."""

    def test_default_settings_has_no_secret(self) -> None:
        assert (
            Settings(
                database_url="postgresql://testuser:testpass@localhost/testdb",
                overpass_url="http://mock-overpass",
                osrm_url="http://mock-osrm",
                redis_url="redis://localhost:6379",
            ).api_shared_secret
            is None
        )
