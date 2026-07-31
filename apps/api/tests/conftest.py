from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.config.scoring_config import (
    CATEGORY_FACILITY_WEIGHTS,
    CATEGORY_WEIGHTS,
    FACILITY_CONFIGS,
)
from app.config.scoring_config_loader import ScoringConfig
from app.config.settings import Settings, get_settings
from app.main import create_app
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService


def build_test_scoring_config() -> ScoringConfig:
    """The same default facility/scoring data the DB would be seeded with,
    assembled synchronously for tests (no DB round-trip)."""
    from app.schemas.responses import CategoryInfo

    categories = [
        CategoryInfo(id=slug, label=cfg.label, implemented=cfg.implemented, color=cfg.color)
        for slug, cfg in FACILITY_CONFIGS.items()
    ]
    category_tags = {slug: cfg.osm_tags for slug, cfg in FACILITY_CONFIGS.items()}
    return ScoringConfig(
        facility_configs=FACILITY_CONFIGS,
        category_facility_weights=CATEGORY_FACILITY_WEIGHTS,
        category_weights=CATEGORY_WEIGHTS,
        categories=categories,
        category_tags=category_tags,
    )


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
def test_client() -> TestClient:
    """Synchronous test client with mocked external dependencies."""
    application = create_app()
    application.dependency_overrides[get_settings] = override_settings

    cache = CacheRepository(client=None)
    mock_http = MagicMock()

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
            application.state.geocoding_svc = GeocodingService(_mock_address_repo(), cache)
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


@pytest.fixture
async def async_test_client() -> AsyncClient:
    """Async test client for async test scenarios."""
    application = create_app()
    cache = CacheRepository(client=None)
    mock_http = MagicMock()

    scoring_config = build_test_scoring_config()
    overpass = OverpassClient("http://mock-overpass", mock_http, scoring_config.category_tags)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
        patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring_config)),
    ):
        async with AsyncClient(app=application, base_url="http://test") as client:
            application.state.scoring_config = scoring_config
            application.state.geocoding_svc = GeocodingService(_mock_address_repo(), cache)
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
