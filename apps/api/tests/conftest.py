from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

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


def override_settings() -> Settings:
    return Settings(
        database_url="postgresql://testuser:testpass@localhost/testdb",
        overpass_url="http://mock-overpass",
        osrm_url="http://mock-osrm",
        redis_url="redis://localhost:6379",
    )


def _mock_address_repo() -> AddressRepository:
    repo = MagicMock(spec=AddressRepository)
    repo.search = AsyncMock(return_value=[])
    return repo


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
    application.dependency_overrides[get_settings] = override_settings

    cache = CacheRepository(client=None)
    mock_http = MagicMock()

    overpass = OverpassClient("http://mock-overpass", mock_http)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
    ):
        with TestClient(application) as client:
            application.state.geocoding_svc = GeocodingService(_mock_address_repo(), cache)
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

    overpass = OverpassClient("http://mock-overpass", mock_http)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
    ):
        async with AsyncClient(app=application, base_url="http://test") as client:
            application.state.geocoding_svc = GeocodingService(_mock_address_repo(), cache)
            application.state.facilities_svc = FacilitiesService(overpass, cache)
            application.state.distance_svc = DistanceService(osrm, cache)
            application.state.scoring_svc = LocationScoringService()
            yield client
