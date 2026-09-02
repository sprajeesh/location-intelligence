"""Tests for GET /parcels (app/api/parcels.py)."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi.testclient import TestClient


def _feature() -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [[[174.7, -36.8], [174.8, -36.8]]]},
        "properties": {"id": 123},
    }


class TestGetParcels:
    def test_returns_feature_when_found(self, test_client: TestClient) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        app.state.linz_client.find_nearest_parcel = AsyncMock(return_value=_feature())

        response = test_client.get("/parcels", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 200
        assert response.json() == _feature()

    def test_returns_404_when_no_parcel_found(self, test_client: TestClient) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        app.state.linz_client.find_nearest_parcel = AsyncMock(return_value=None)

        response = test_client.get("/parcels", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 404

    def test_returns_502_on_upstream_failure(self, test_client: TestClient) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        app.state.linz_client.find_nearest_parcel = AsyncMock(side_effect=RuntimeError("boom"))

        response = test_client.get("/parcels", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 502

    def test_returns_502_on_http_status_error_without_leaking_url(
        self, test_client: TestClient, caplog: pytest.LogCaptureFixture
    ) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        request = httpx.Request(
            "GET", "https://data.linz.govt.nz/services/query/v1/vector.json?key=super-secret-key"
        )
        response_500 = httpx.Response(status_code=500, request=request)
        app.state.linz_client.find_nearest_parcel = AsyncMock(
            side_effect=httpx.HTTPStatusError("boom", request=request, response=response_500)
        )

        with caplog.at_level("ERROR"):
            response = test_client.get("/parcels", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 502
        assert "super-secret-key" not in caplog.text
        assert "500" in caplog.text

    def test_rejects_out_of_range_latitude(self, test_client: TestClient) -> None:
        response = test_client.get("/parcels", params={"lat": -91, "lon": 174.7633})

        assert response.status_code == 400

    def test_rejects_out_of_range_longitude(self, test_client: TestClient) -> None:
        response = test_client.get("/parcels", params={"lat": -36.8485, "lon": 181})

        assert response.status_code == 400
