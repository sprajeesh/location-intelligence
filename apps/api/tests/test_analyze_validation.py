"""Tests for AnalyzeRequest input hardening and the /location/analyze
in-flight concurrency cap (the confirmed 'categories: [garbage]*N' abuse
vector, plus process-wide resource-exhaustion protection)."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


class TestCategoriesValidation:
    def test_oversized_categories_returns_422(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={
                "lat": -36.848,
                "lon": 174.763,
                "radiusKm": 5,
                "categories": [f"cat{i}" for i in range(51)],
            },
        )
        assert response.status_code == 422

    def test_unknown_category_returns_422_with_detail(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={
                "lat": -36.848,
                "lon": 174.763,
                "radiusKm": 5,
                "categories": ["not_a_real_category"],
            },
        )
        assert response.status_code == 422
        assert "not_a_real_category" in response.text

    def test_duplicate_categories_deduped_before_fetch_all(self, test_client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ) as mock_fetch_all:
            response = test_client.post(
                "/location/analyze",
                json={
                    "lat": -36.848,
                    "lon": 174.763,
                    "radiusKm": 5,
                    "categories": ["schools", "schools", "schools"],
                },
            )
        assert response.status_code == 200
        assert mock_fetch_all.call_args.args[0] == ["schools"]

    def test_radius_km_above_new_cap_returns_422(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={"lat": -36.848, "lon": 174.763, "radiusKm": 100, "categories": ["schools"]},
        )
        assert response.status_code == 422


class TestAnalyzeCapacityGuard:
    def test_returns_503_when_in_flight_limit_reached(self, test_client: TestClient) -> None:
        limiter = test_client.app.state.analyze_in_flight_limiter
        acquired = []
        while limiter.try_acquire():
            acquired.append(True)  # exhaust every slot

        try:
            response = test_client.post(
                "/location/analyze",
                json={"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": ["schools"]},
            )
            assert response.status_code == 503
            assert "Retry-After" in response.headers
        finally:
            for _ in acquired:
                limiter.release()

    def test_succeeds_once_a_slot_is_free_again(self, test_client: TestClient) -> None:
        with patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new_callable=AsyncMock,
            return_value=([], [], set()),
        ):
            response = test_client.post(
                "/location/analyze",
                json={"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": ["schools"]},
            )
        assert response.status_code == 200
