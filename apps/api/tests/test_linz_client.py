"""Tests for the LINZ Query API client (app/clients/linz.py)."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.clients.linz import PARCELS_LAYER_ID, LinzClient


def _response(json_data: dict, status_code: int = 200) -> httpx.Response:
    request = httpx.Request("GET", "http://mock-linz")
    return httpx.Response(status_code=status_code, json=json_data, request=request)


def _vector_query_response(features: list[dict]) -> dict:
    return {"vectorQuery": {"layers": {str(PARCELS_LAYER_ID): {"features": features}}}}


class TestFindNearestParcel:
    async def test_returns_nearest_feature(self) -> None:
        feature = {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[[174.7, -36.8], [174.8, -36.8]]]},
            "properties": {"id": 123},
        }
        mock_http = MagicMock()
        mock_http.get = AsyncMock(return_value=_response(_vector_query_response([feature])))

        client = LinzClient("test-key", mock_http)
        result = await client.find_nearest_parcel(-36.8485, 174.7633)

        assert result == feature
        params = mock_http.get.call_args.kwargs["params"]
        assert params["key"] == "test-key"
        assert params["layer"] == PARCELS_LAYER_ID
        assert params["x"] == 174.7633
        assert params["y"] == -36.8485

    async def test_returns_none_when_no_features(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock(return_value=_response(_vector_query_response([])))

        client = LinzClient("test-key", mock_http)
        result = await client.find_nearest_parcel(-36.8485, 174.7633)

        assert result is None

    async def test_raises_without_api_key(self) -> None:
        client = LinzClient(None, MagicMock())

        with pytest.raises(RuntimeError):
            await client.find_nearest_parcel(-36.8485, 174.7633)

    async def test_raises_on_http_error(self) -> None:
        mock_http = MagicMock()
        mock_http.get = AsyncMock(return_value=_response({}, status_code=500))

        client = LinzClient("test-key", mock_http)

        with pytest.raises(httpx.HTTPStatusError):
            await client.find_nearest_parcel(-36.8485, 174.7633)
