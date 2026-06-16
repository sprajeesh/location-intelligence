"""Integration tests for /health and /categories endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.clients.photon import PhotonClient
from app.main import create_app
from app.repositories.cache import CacheRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService


@pytest.fixture(scope="module")
def client() -> TestClient:
    application = create_app()
    cache = CacheRepository(client=None)
    mock_http = MagicMock()

    photon = PhotonClient("http://mock-photon", mock_http)
    overpass = OverpassClient("http://mock-overpass", mock_http)
    osrm = OSRMClient("http://mock-osrm", mock_http)

    with TestClient(application) as c:
        application.state.geocoding_svc = GeocodingService(photon, cache)
        application.state.facilities_svc = FacilitiesService(overpass, cache)
        application.state.distance_svc = DistanceService(osrm, cache)
        application.state.scoring_svc = LocationScoringService()
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_body(self, client: TestClient) -> None:
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0.0"

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
        assert len(data) == 8

    def test_categories_has_required_fields(self, client: TestClient) -> None:
        response = client.get("/categories")
        for item in response.json():
            assert "id" in item
            assert "label" in item
            assert "implemented" in item
            assert "color" in item

    def test_schools_implemented(self, client: TestClient) -> None:
        response = client.get("/categories")
        schools = next(c for c in response.json() if c["id"] == "schools")
        assert schools["implemented"] is True

    def test_bus_stops_implemented(self, client: TestClient) -> None:
        response = client.get("/categories")
        bus_stops = next(c for c in response.json() if c["id"] == "bus_stops")
        assert bus_stops["implemented"] is True

    def test_hospitals_not_implemented(self, client: TestClient) -> None:
        response = client.get("/categories")
        hospitals = next(c for c in response.json() if c["id"] == "hospitals")
        assert hospitals["implemented"] is False

    def test_category_ids_match_spec(self, client: TestClient) -> None:
        response = client.get("/categories")
        ids = {c["id"] for c in response.json()}
        expected = {
            "schools", "bus_stops", "hospitals", "universities",
            "supermarkets", "parks", "libraries", "pharmacies"
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


class TestAnalyzeEndpointWithCoords:
    def test_analyze_with_lat_lon_no_facilities(self, client: TestClient) -> None:
        """When Overpass returns nothing, should return 200 with warning."""
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], []),
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
            return_value=([], []),
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
            return_value=([], []),
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
