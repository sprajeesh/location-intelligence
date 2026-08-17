"""Unit tests for the /hazard/cells bbox validation."""

import pytest
from fastapi import HTTPException

from app.api.hazard import MAX_BBOX_SPAN_DEGREES, _parse_bbox


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
