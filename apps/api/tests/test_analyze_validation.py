"""Tests for AnalyzeRequest input hardening and the /location/analyze
in-flight concurrency cap (the confirmed 'categories: [garbage]*N' abuse
vector, plus process-wide resource-exhaustion protection)."""

from unittest.mock import AsyncMock, patch

import pytest
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


class TestCategoryWeightsValidation:
    def test_unknown_category_weight_key_returns_422(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={
                "lat": -36.848,
                "lon": 174.763,
                "radiusKm": 5,
                "categories": ["schools"],
                "categoryWeights": {"not_a_real_category": 0.5},
            },
        )
        assert response.status_code == 422
        assert "not_a_real_category" in response.text

    def test_negative_category_weight_returns_422(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={
                "lat": -36.848,
                "lon": 174.763,
                "radiusKm": 5,
                "categories": ["schools"],
                "categoryWeights": {"education": -0.1},
            },
        )
        assert response.status_code == 422

    def test_oversized_category_weights_returns_422(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={
                "lat": -36.848,
                "lon": 174.763,
                "radiusKm": 5,
                "categories": ["schools"],
                "categoryWeights": {f"cat{i}": 0.1 for i in range(11)},
            },
        )
        assert response.status_code == 422

    def test_huge_finite_category_weight_returns_422(self, test_client: TestClient) -> None:
        response = test_client.post(
            "/location/analyze",
            json={
                "lat": -36.848,
                "lon": 174.763,
                "radiusKm": 5,
                "categories": ["schools"],
                "categoryWeights": {"education": 1e308},
            },
        )
        assert response.status_code == 422

    @pytest.mark.parametrize("literal", ["Infinity", "-Infinity", "NaN"])
    def test_non_finite_category_weight_returns_422(
        self, test_client: TestClient, literal: str
    ) -> None:
        # json.dumps' non-standard Infinity/-Infinity/NaN tokens (which Python's
        # own json module both emits and parses by default) are the only way to
        # get a non-finite float onto the wire -- httpx's `json=` kwarg can't
        # encode float("inf")/float("nan") via the standard json module either,
        # so send the raw body directly.
        body = (
            '{"lat": -36.848, "lon": 174.763, "radiusKm": 5, '
            '"categories": ["schools"], '
            f'"categoryWeights": {{"education": {literal}}}}}'
        )
        response = test_client.post(
            "/location/analyze",
            content=body,
            headers={"content-type": "application/json"},
        )
        assert response.status_code == 422

    def test_valid_category_weights_are_accepted_and_passed_to_scoring_svc(
        self, test_client: TestClient
    ) -> None:
        with (
            patch(
                "app.services.facilities.FacilitiesService.fetch_all",
                new_callable=AsyncMock,
                return_value=([], [], set()),
            ),
            patch(
                "app.services.scoring.LocationScoringService.score",
                wraps=test_client.app.state.scoring_svc.score,
            ) as mock_score,
        ):
            response = test_client.post(
                "/location/analyze",
                json={
                    "lat": -36.848,
                    "lon": 174.763,
                    "radiusKm": 5,
                    "categories": ["schools", "bus_stops"],
                    "categoryWeights": {"education": 0.7, "transport": 0.3},
                },
            )
        assert response.status_code == 200
        assert mock_score.call_args.kwargs["category_weight_overrides"] == {
            "education": 0.7,
            "transport": 0.3,
        }


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
