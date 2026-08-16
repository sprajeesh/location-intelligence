from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.config.hazard_config import HAZARD_TYPE_CONFIGS
from app.config.hazard_config_loader import HazardScoringConfig
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
from app.repositories.db.hazard_repository import HazardRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.hazard_scoring import HazardScoringService
from app.services.scoring import LocationScoringService


def build_test_scoring_config() -> ScoringConfig:
    """The same default facility/scoring data the DB would be seeded with,
    assembled synchronously for tests (no DB round-trip)."""
    from app.schemas.responses import CategoryInfo

    categories = [
        CategoryInfo(
            id=slug,
            label=cfg.label,
            implemented=cfg.implemented,
            color=cfg.color,
            is_default=cfg.is_default,
            composite_category=cfg.composite_category,
        )
        for slug, cfg in FACILITY_CONFIGS.items()
    ]
    category_tags = {slug: cfg.osm_tags for slug, cfg in FACILITY_CONFIGS.items()}
    default_categories = [slug for slug, cfg in FACILITY_CONFIGS.items() if cfg.is_default]
    return ScoringConfig(
        facility_configs=FACILITY_CONFIGS,
        category_facility_weights=CATEGORY_FACILITY_WEIGHTS,
        category_weights=CATEGORY_WEIGHTS,
        categories=categories,
        category_tags=category_tags,
        default_categories=default_categories,
    )


def build_test_hazard_config() -> HazardScoringConfig:
    """The same demo_hazard config the DB would be seeded with (see
    alembic/versions/0003_create_hazard_tables.py), assembled synchronously
    for tests (no DB round-trip)."""
    return HazardScoringConfig(hazard_types=HAZARD_TYPE_CONFIGS)


def _mock_hazard_repo() -> HazardRepository:
    """A repo with no cells populated -- every point lookup returns "no
    coverage" (hazard: null in responses), which is the correct default for
    tests that don't care about hazard scoring specifically."""
    repo = MagicMock(spec=HazardRepository)
    repo.fetch_cell_scores = AsyncMock(return_value=[])
    repo.fetch_cells_in_bbox = AsyncMock(return_value=[])
    return repo


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

    hazard_config = build_test_hazard_config()

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
        patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring_config)),
        patch("app.main.load_hazard_config", new=AsyncMock(return_value=hazard_config)),
    ):
        with TestClient(application) as client:
            application.state.scoring_config = scoring_config
            hazard_repo = _mock_hazard_repo()
            application.state.hazard_repo = hazard_repo
            application.state.hazard_svc = HazardScoringService(hazard_repo, hazard_config)
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

    hazard_config = build_test_hazard_config()

    with (
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
        patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring_config)),
        patch("app.main.load_hazard_config", new=AsyncMock(return_value=hazard_config)),
    ):
        async with AsyncClient(app=application, base_url="http://test") as client:
            application.state.scoring_config = scoring_config
            hazard_repo = _mock_hazard_repo()
            application.state.hazard_repo = hazard_repo
            application.state.hazard_svc = HazardScoringService(hazard_repo, hazard_config)
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
