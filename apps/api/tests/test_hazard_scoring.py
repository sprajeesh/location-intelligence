"""Unit tests for HazardScoringService -- coverage vs no-coverage, and the
composite/worst-hazard math. Uses a fake repository (no DB round-trip),
matching the pattern in test_facility_config_repository.py."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config.hazard_config import HazardTypeConfig
from app.config.hazard_config_loader import HazardScoringConfig
from app.repositories.db.hazard_repository import HazardRepository
from app.services.hazard_scoring import HazardScoringService

DEMO_HAZARD_TYPE = HazardTypeConfig(
    label="Demo Hazard",
    color="#b2182b",
    description="scaffold placeholder",
    default_weight=1.0,
    severe_threshold=80.0,
    is_proxy=True,
    implemented=True,
)

SECOND_HAZARD_TYPE = HazardTypeConfig(
    label="Second Hazard",
    color="#2166ac",
    description="a second hazard type for composite/worst-hazard math tests",
    default_weight=3.0,
    severe_threshold=80.0,
    is_proxy=False,
    implemented=True,
)


def _config(hazard_types: dict[str, HazardTypeConfig]) -> HazardScoringConfig:
    return HazardScoringConfig(hazard_types=hazard_types, resolution=7)


def _mock_repo(cell_rows: list[dict]) -> HazardRepository:
    repo = MagicMock(spec=HazardRepository)
    repo.fetch_cell_scores = AsyncMock(return_value=cell_rows)
    return repo


class TestHazardScoringServiceNoCoverage:
    async def test_returns_none_when_cell_has_no_rows(self) -> None:
        service = HazardScoringService(_mock_repo([]), _config({"demo_hazard": DEMO_HAZARD_TYPE}))

        result = await service.score_point(-36.85, 174.76)

        assert result is None


class TestHazardScoringServiceComposite:
    async def test_single_hazard_composite_equals_its_score(self) -> None:
        rows = [
            {
                "hazard_type_slug": "demo_hazard",
                "score": 42.0,
                "severe": False,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Phase-0 Scaffold Dummy Generator",
                "licence": "N/A",
            }
        ]
        service = HazardScoringService(_mock_repo(rows), _config({"demo_hazard": DEMO_HAZARD_TYPE}))

        result = await service.score_point(-36.85, 174.76)

        assert result is not None
        assert result.composite_score == 42.0
        assert result.worst_hazard_type == "demo_hazard"
        assert result.worst_hazard_score == 42.0
        assert result.any_severe is False
        assert result.hazards[0].is_proxy is True

    async def test_composite_is_weighted_average_across_hazard_types(self) -> None:
        rows = [
            {
                "hazard_type_slug": "demo_hazard",
                "score": 40.0,
                "severe": False,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Demo source",
                "licence": "N/A",
            },
            {
                "hazard_type_slug": "second_hazard",
                "score": 80.0,
                "severe": True,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Second source",
                "licence": "CC BY 4.0",
            },
        ]
        service = HazardScoringService(
            _mock_repo(rows),
            _config({"demo_hazard": DEMO_HAZARD_TYPE, "second_hazard": SECOND_HAZARD_TYPE}),
        )

        result = await service.score_point(-36.85, 174.76)

        assert result is not None
        # weighted avg: (40*1 + 80*3) / (1+3) = 70.0
        assert result.composite_score == pytest.approx(70.0)
        # worst-hazard must surface the max sub-score even though the
        # composite (70) looks only "moderate-high" -- never averaged away.
        assert result.worst_hazard_type == "second_hazard"
        assert result.worst_hazard_score == 80.0
        assert result.any_severe is True

    async def test_unknown_hazard_type_slug_is_filtered_not_raised(self) -> None:
        rows = [
            {
                "hazard_type_slug": "demo_hazard",
                "score": 40.0,
                "severe": False,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Demo source",
                "licence": "N/A",
            },
            {
                "hazard_type_slug": "not_yet_cached_hazard",
                "score": 95.0,
                "severe": True,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Future source",
                "licence": "N/A",
            },
        ]
        service = HazardScoringService(_mock_repo(rows), _config({"demo_hazard": DEMO_HAZARD_TYPE}))

        result = await service.score_point(-36.85, 174.76)

        assert result is not None
        assert result.composite_score == 40.0
        assert result.worst_hazard_type == "demo_hazard"
        assert [s.hazard_type for s in result.hazards] == ["demo_hazard"]

    async def test_returns_none_when_all_rows_have_unknown_hazard_type(self) -> None:
        rows = [
            {
                "hazard_type_slug": "not_yet_cached_hazard",
                "score": 95.0,
                "severe": True,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Future source",
                "licence": "N/A",
            }
        ]
        service = HazardScoringService(_mock_repo(rows), _config({"demo_hazard": DEMO_HAZARD_TYPE}))

        result = await service.score_point(-36.85, 174.76)

        assert result is None

    async def test_severe_flag_true_when_any_hazard_is_severe(self) -> None:
        rows = [
            {
                "hazard_type_slug": "demo_hazard",
                "score": 10.0,
                "severe": False,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Demo source",
                "licence": "N/A",
            },
            {
                "hazard_type_slug": "second_hazard",
                "score": 95.0,
                "severe": True,
                "data_currency_date": date(2026, 8, 1),
                "source_name": "Second source",
                "licence": "CC BY 4.0",
            },
        ]
        service = HazardScoringService(
            _mock_repo(rows),
            _config({"demo_hazard": DEMO_HAZARD_TYPE, "second_hazard": SECOND_HAZARD_TYPE}),
        )

        result = await service.score_point(-36.85, 174.76)

        assert result is not None
        assert result.any_severe is True
        assert result.worst_hazard_score == 95.0
