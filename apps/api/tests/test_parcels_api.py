"""Tests for GET /parcels/at-point (app/api/parcels.py)."""

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient


def _feature() -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [[[174.7, -36.8], [174.8, -36.8]]]},
        "properties": {"id": 123},
    }


class TestGetParcelAtPoint:
    def test_returns_feature_when_found(self, test_client: TestClient) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        app.state.linz_client.find_nearest_parcel = AsyncMock(return_value=_feature())

        response = test_client.get("/parcels/at-point", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 200
        assert response.json() == _feature()

    def test_returns_404_when_no_parcel_found(self, test_client: TestClient) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        app.state.linz_client.find_nearest_parcel = AsyncMock(return_value=None)

        response = test_client.get("/parcels/at-point", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 404

    def test_returns_502_on_upstream_failure(self, test_client: TestClient) -> None:
        app = test_client.app
        app.state.linz_client = MagicMock()
        app.state.linz_client.find_nearest_parcel = AsyncMock(side_effect=RuntimeError("boom"))

        response = test_client.get("/parcels/at-point", params={"lat": -36.8485, "lon": 174.7633})

        assert response.status_code == 502

    def test_rejects_out_of_range_latitude(self, test_client: TestClient) -> None:
        response = test_client.get("/parcels/at-point", params={"lat": -91, "lon": 174.7633})

        assert response.status_code == 400

    def test_rejects_out_of_range_longitude(self, test_client: TestClient) -> None:
        response = test_client.get("/parcels/at-point", params={"lat": -36.8485, "lon": 181})

        assert response.status_code == 400
