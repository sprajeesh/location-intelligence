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
from tests.conftest import build_test_scoring_config

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
    scoring_config = build_test_scoring_config()
    overpass = OverpassClient("http://mock-overpass", mock_http, scoring_config.category_tags)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
        patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring_config)),
    ):
        with TestClient(application) as client:
            application.state.scoring_config = scoring_config
            application.state.geocoding_svc = GeocodingService(mock_addr_repo, cache)
            application.state.facilities_svc = FacilitiesService(overpass, cache, scoring_config)
            application.state.distance_svc = DistanceService(
                osrm, cache, scoring_config.facility_configs
            )
            application.state.scoring_svc = LocationScoringService(
                scoring_config.facility_configs,
                scoring_config.category_facility_weights,
                scoring_config.category_weights,
            )
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
        assert not Settings(
            database_url="postgresql://testuser:testpass@localhost/testdb",
            overpass_url="http://mock-overpass",
            osrm_url="http://mock-osrm",
            redis_url="redis://localhost:6379",
        ).api_shared_secret


class TestProductionRequiresSecret:
    """environment=production without api_shared_secret or linz_api_key must
    fail fast at startup, not silently run with enforcement skipped."""

    def _kwargs(self, **overrides: object) -> dict[str, object]:
        return {
            "database_url": "postgresql://testuser:testpass@localhost/testdb",
            "overpass_url": "http://mock-overpass",
            "osrm_url": "http://mock-osrm",
            "redis_url": "redis://localhost:6379",
            **overrides,
        }

    def test_production_without_api_secret_raises(self) -> None:
        with pytest.raises(ValueError, match="api_shared_secret must be set"):
            Settings(**self._kwargs(environment="production", linz_api_key="test-key"))

    def test_production_without_linz_key_raises(self) -> None:
        with pytest.raises(ValueError, match="linz_api_key must be set"):
            Settings(**self._kwargs(environment="production", api_shared_secret=SECRET))

    def test_production_with_secret_is_allowed(self) -> None:
        settings = Settings(
            **self._kwargs(
                environment="production",
                api_shared_secret=SECRET,
                linz_api_key="test-linz-key",
            )
        )
        assert settings.api_shared_secret == SECRET
        assert settings.linz_api_key == "test-linz-key"

    def test_development_without_secret_is_allowed(self) -> None:
        settings = Settings(**self._kwargs(environment="development"))
        assert not settings.api_shared_secret
