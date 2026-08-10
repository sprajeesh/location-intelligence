"""Integration tests for /health and /categories endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.config.version import get_version
from app.main import create_app
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService
from tests.conftest import build_test_scoring_config


@pytest.fixture(scope="module")
def client() -> TestClient:
    application = create_app()
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
        with TestClient(application) as c:
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
            yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_body(self, client: TestClient) -> None:
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == get_version()

    def test_health_content_type_json(self, client: TestClient) -> None:
        response = client.get("/health")
        assert "application/json" in response.headers["content-type"]


class TestCategoriesEndpoint:
    def test_categories_returns_200(self, client: TestClient) -> None:
        response = client.get("/categories")
        assert response.status_code == 200

    def test_categories_is_list(self, client: TestClient) -> None:
        response = client.get("/categories")
        data = response.json()
        assert isinstance(data, list)

    def test_categories_count(self, client: TestClient) -> None:
        response = client.get("/categories")
        data = response.json()
        assert len(data) == 12

    def test_categories_has_required_fields(self, client: TestClient) -> None:
        response = client.get("/categories")
        for item in response.json():
            assert "id" in item
            assert "label" in item
            assert "implemented" in item
            assert "color" in item
            assert "compositeCategory" in item

    def test_schools_implemented(self, client: TestClient) -> None:
        response = client.get("/categories")
        schools = next(c for c in response.json() if c["id"] == "schools")
        assert schools["implemented"] is True

    def test_bus_stops_implemented(self, client: TestClient) -> None:
        response = client.get("/categories")
        bus_stops = next(c for c in response.json() if c["id"] == "bus_stops")
        assert bus_stops["implemented"] is True

    def test_hospitals_implemented(self, client: TestClient) -> None:
        response = client.get("/categories")
        hospitals = next(c for c in response.json() if c["id"] == "hospitals")
        assert hospitals["implemented"] is True

    def test_category_ids_match_spec(self, client: TestClient) -> None:
        response = client.get("/categories")
        ids = {c["id"] for c in response.json()}
        expected = {
            "schools",
            "kindergartens",
            "bus_stops",
            "railway_stations",
            "hospitals",
            "gps",
            "universities",
            "supermarkets",
            "parks",
            "playgrounds",
            "libraries",
            "pharmacies",
        }
        assert ids == expected

    def test_category_colors_are_hex(self, client: TestClient) -> None:
        response = client.get("/categories")
        for item in response.json():
            color = item["color"]
            assert color.startswith("#"), f"Expected hex color, got {color}"
            assert len(color) == 7, f"Expected #RRGGBB format, got {color}"

    def test_schools_color(self, client: TestClient) -> None:
        response = client.get("/categories")
        schools = next(c for c in response.json() if c["id"] == "schools")
        assert schools["color"] == "#F59E0B"

    def test_default_categories_are_the_expected_five(self, client: TestClient) -> None:
        response = client.get("/categories")
        defaults = {c["id"] for c in response.json() if c["isDefault"]}
        assert defaults == {"schools", "gps", "bus_stops", "railway_stations", "supermarkets"}

    def test_composite_category_groups_facility_types_correctly(self, client: TestClient) -> None:
        response = client.get("/categories")
        composite_by_id = {c["id"]: c["compositeCategory"] for c in response.json()}
        assert composite_by_id["schools"] == "education"
        assert composite_by_id["kindergartens"] == "education"
        assert composite_by_id["universities"] == "education"
        assert composite_by_id["bus_stops"] == "transport"
        assert composite_by_id["railway_stations"] == "transport"
        assert composite_by_id["hospitals"] == "healthcare"
        assert composite_by_id["gps"] == "healthcare"
        assert composite_by_id["pharmacies"] == "healthcare"
        assert composite_by_id["supermarkets"] == "shopping"
        assert composite_by_id["parks"] == "recreation"
        assert composite_by_id["playgrounds"] == "recreation"
        assert composite_by_id["libraries"] == "recreation"


class TestAnalyzeEndpointWithCoords:
    def test_analyze_with_lat_lon_no_facilities(self, client: TestClient) -> None:
        """When Overpass returns nothing, should return 200 with warning."""
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            response = client.post(
                "/location/analyze",
                json={
                    "lat": -36.848,
                    "lon": 174.763,
                    "radiusKm": 5,
                    "categories": ["schools"],
                    "distanceMode": "driving",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["location"]["lat"] == -36.848
        assert data["location"]["lon"] == 174.763
        assert data["features"] == []
        # Warning about no facilities
        assert any("No facilities" in w for w in data["warnings"])

    def test_analyze_response_has_required_fields(self, client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            response = client.post(
                "/location/analyze",
                json={"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": ["schools"]},
            )
        data = response.json()
        assert "location" in data
        assert "features" in data
        assert "score" in data
        assert "warnings" in data

    def test_analyze_score_has_coverage(self, client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            response = client.post(
                "/location/analyze",
                json={"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": ["schools"]},
            )
        score = response.json()["score"]
        assert "coverage" in score
        assert "/" in score["coverage"]

    def test_analyze_missing_both_address_and_coords(self, client: TestClient) -> None:
        response = client.post(
            "/location/analyze",
            json={"radiusKm": 5, "categories": ["schools"]},
        )
        assert response.status_code == 422

    def test_omitted_categories_uses_db_defaults(self, client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ) as mock_fetch_all:
            response = client.post(
                "/location/analyze",
                json={"lat": -36.848, "lon": 174.763, "radiusKm": 5},
            )
        assert response.status_code == 200
        requested = mock_fetch_all.call_args.args[0]
        assert set(requested) == {"schools", "gps", "bus_stops", "railway_stations", "supermarkets"}

    def test_explicit_empty_categories_returns_none_overall(self, client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ) as mock_fetch_all:
            response = client.post(
                "/location/analyze",
                json={"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": []},
            )
        assert mock_fetch_all.call_args.args[0] == []
        assert response.json()["score"]["overall"] is None


class TestSearchAddressEndpoint:
    def test_search_returns_404_when_no_results(self, client: TestClient) -> None:
        with patch(
            "app.services.geocoding.GeocodingService.search",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = client.get("/search/address?q=nonexistentplace12345")
        assert response.status_code == 404

    def test_search_returns_address_list(self, client: TestClient) -> None:
        mock_results = [
            {"displayName": "123 Queen Street, Auckland", "lat": -36.848, "lon": 174.763}
        ]
        with patch(
            "app.services.geocoding.GeocodingService.search",
            new_callable=AsyncMock,
            return_value=mock_results,
        ):
            response = client.get("/search/address?q=Queen+Street+Auckland")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["displayName"] == "123 Queen Street, Auckland"

    def test_search_requires_q_param(self, client: TestClient) -> None:
        response = client.get("/search/address")
        assert response.status_code == 422
