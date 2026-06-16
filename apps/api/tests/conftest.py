from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.clients.photon import PhotonClient
from app.config.settings import Settings, get_settings
from app.main import create_app
from app.repositories.cache import CacheRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService


def override_settings() -> Settings:
    return Settings(
        photon_url="http://mock-photon",
        overpass_url="http://mock-overpass",
        osrm_url="http://mock-osrm",
        redis_url="redis://localhost:6379",
    )


@pytest.fixture
def mock_cache() -> CacheRepository:
    """A cache that always misses and silently drops sets."""
    return CacheRepository(client=None)


@pytest.fixture
def scoring_service() -> LocationScoringService:
    return LocationScoringService(alpha=0.6, beta=0.4, density_factor=10.0)


@pytest.fixture
def test_client() -> TestClient:
    """Synchronous test client with mocked external dependencies."""
    application = create_app()

    # Override settings dependency
    application.dependency_overrides[get_settings] = override_settings

    # Build no-op cache
    cache = CacheRepository(client=None)

    # Mock HTTP client (not actually used via TestClient lifespan in sync mode)
    mock_http = MagicMock()

    photon = PhotonClient("http://mock-photon", mock_http)
    overpass = OverpassClient("http://mock-overpass", mock_http)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with TestClient(application) as client:
        # Attach mocked services directly to app state
        application.state.geocoding_svc = GeocodingService(photon, cache)
        application.state.facilities_svc = FacilitiesService(overpass, cache)
        application.state.distance_svc = DistanceService(osrm, cache)
        application.state.scoring_svc = LocationScoringService()
        yield client


@pytest.fixture
async def async_test_client() -> AsyncClient:
    """Async test client for async test scenarios."""
    application = create_app()
    cache = CacheRepository(client=None)
    mock_http = MagicMock()

    photon = PhotonClient("http://mock-photon", mock_http)
    overpass = OverpassClient("http://mock-overpass", mock_http)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    async with AsyncClient(app=application, base_url="http://test") as client:
        application.state.geocoding_svc = GeocodingService(photon, cache)
        application.state.facilities_svc = FacilitiesService(overpass, cache)
        application.state.distance_svc = DistanceService(osrm, cache)
        application.state.scoring_svc = LocationScoringService()
        yield client
