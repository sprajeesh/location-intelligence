"""Unit tests for the /hazard/cells bbox validation and composite scoring."""

from datetime import date
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.hazard import MAX_BBOX_SPAN_DEGREES, _parse_bbox
from app.config.hazard_config import HazardTypeConfig
from app.config.hazard_config_loader import HazardScoringConfig

SECOND_HAZARD_TYPE = HazardTypeConfig(
    label="Second Hazard",
    color="#2166ac",
    description="a second hazard type for composite math tests",
    default_weight=3.0,
    severe_threshold=80.0,
    is_proxy=False,
    implemented=True,
)


class TestParseBbox:
    def test_valid_bbox_parses_in_order(self) -> None:
        assert _parse_bbox("174.7,-36.9,174.8,-36.8") == (174.7, -36.9, 174.8, -36.8)

    def test_wrong_part_count_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("174.7,-36.9,174.8")
        assert exc_info.value.status_code == 422

    def test_non_numeric_part_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("174.7,-36.9,nope,-36.8")
        assert exc_info.value.status_code == 422

    def test_longitude_out_of_range_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("-181,-36.9,174.8,-36.8")
        assert exc_info.value.status_code == 422

    def test_latitude_out_of_range_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("174.7,-91,174.8,-36.8")
        assert exc_info.value.status_code == 422

    def test_inverted_longitude_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("174.8,-36.9,174.7,-36.8")
        assert exc_info.value.status_code == 422

    def test_inverted_latitude_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("174.7,-36.8,174.8,-36.9")
        assert exc_info.value.status_code == 422

    def test_degenerate_bbox_rejected(self) -> None:
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox("174.7,-36.9,174.7,-36.9")
        assert exc_info.value.status_code == 422

    def test_oversized_span_rejected(self) -> None:
        max_span = MAX_BBOX_SPAN_DEGREES
        with pytest.raises(HTTPException) as exc_info:
            _parse_bbox(f"0,0,{max_span + 1},{max_span + 1}")
        assert exc_info.value.status_code == 422

    def test_span_at_max_is_allowed(self) -> None:
        max_span = MAX_BBOX_SPAN_DEGREES
        assert _parse_bbox(f"0,0,{max_span},{max_span}") == (0.0, 0.0, max_span, max_span)


class TestHazardCellsComposite:
    def test_composite_is_weighted_by_default_weight(self, test_client: TestClient) -> None:
        app = test_client.app
        hazard_types = dict(app.state.hazard_config.hazard_types)
        hazard_types["second_hazard"] = SECOND_HAZARD_TYPE
        app.state.hazard_config = HazardScoringConfig(hazard_types=hazard_types, resolution=7)

        app.state.hazard_repo.fetch_cells_in_bbox = AsyncMock(
            return_value=[
                {
                    "h3_index": "8752c9adfffffff",
                    "resolution": 7,
                    "geom_json": '{"type":"Polygon","coordinates":[]}',
                    "hazards": [
                        {
                            "hazard_type_slug": "demo_hazard",
                            "score": 40.0,
                            "severe": False,
                            "data_currency_date": date(2026, 8, 1),
                            "source_name": "Demo source",
                            "is_proxy": True,
                        },
                        {
                            "hazard_type_slug": "second_hazard",
                            "score": 80.0,
                            "severe": True,
                            "data_currency_date": date(2026, 8, 1),
                            "source_name": "Second source",
                            "is_proxy": False,
                        },
                    ],
                }
            ]
        )

        response = test_client.get("/hazard/cells", params={"bbox": "174.7,-36.9,174.8,-36.8"})

        assert response.status_code == 200
        properties = response.json()["features"][0]["properties"]
        # weighted avg: (40*1 + 80*3) / (1+3) = 70.0, NOT the unweighted 60.0
        assert properties["composite"] == pytest.approx(70.0)
        assert properties["worstHazard"] == 80.0
        assert properties["worstHazardType"] == "second_hazard"
