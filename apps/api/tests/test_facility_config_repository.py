"""Unit tests for the DB-backed facility config repository and loader.

The session factory is mocked (matching test_address_repository.py) rather than
hitting a real Postgres instance. The repository returns ORM models, so the
mocked rows are model instances built from the same column values.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.dialects import postgresql

from app.config.scoring_config_loader import load_scoring_config
from app.models.facility import CategoryWeight, FacilityType
from app.repositories.db.facility_config_repository import FacilityConfigRepository


def _mock_session_factory(rows: list) -> tuple[MagicMock, MagicMock]:
    session = MagicMock()
    session.scalars = AsyncMock(return_value=rows)

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)

    return MagicMock(return_value=cm), session


def _compiled_sql(session: MagicMock) -> str:
    stmt = session.scalars.call_args.args[0]
    return str(stmt.compile(dialect=postgresql.dialect()))


SCHOOLS_ROW = {
    "slug": "schools",
    "label": "Schools",
    "singular_label": "school",
    "color": "#F59E0B",
    "implemented": True,
    "composite_category": "education",
    "category_weight": 0.55,
    "distance_mode": "walk",
    "decay_constant": 0.4,
    "reference_radius": 1.0,
    "hard_cutoff": 3.0,
    "saturation_point": 3,
    "proximity_weight": 0.5,
    "density_weight": 0.5,
    "count_ceiling": None,
    "drive_decay_constant": None,
    "drive_reference_radius": None,
    "drive_hard_cutoff": None,
    "osm_tags": [["amenity", "school"]],
    "is_default": True,
}

SUPERMARKETS_ROW = {
    "slug": "supermarkets",
    "label": "Supermarkets",
    "singular_label": "supermarket",
    "color": "#10B981",
    "implemented": True,
    "composite_category": "shopping",
    "category_weight": 1.0,
    "distance_mode": "drive",
    "decay_constant": 2,
    "reference_radius": 3,
    "hard_cutoff": 10,
    "saturation_point": 2,
    "proximity_weight": 0.6,
    "density_weight": 0.4,
    "count_ceiling": 3,
    "drive_decay_constant": None,
    "drive_reference_radius": None,
    "drive_hard_cutoff": None,
    "osm_tags": [["shop", "supermarket"]],
    "is_default": True,
}


class TestFacilityConfigRepository:
    async def test_fetch_facility_types_returns_models_ordered_by_slug(self) -> None:
        schools = FacilityType(**SCHOOLS_ROW)
        factory, session = _mock_session_factory([schools])

        rows = await FacilityConfigRepository(factory).fetch_facility_types()

        assert rows == [schools]
        assert isinstance(rows[0], FacilityType)
        assert "ORDER BY facility_types.slug" in _compiled_sql(session)

    async def test_fetch_category_weights_returns_models_ordered_by_category(self) -> None:
        weight = CategoryWeight(id=1, category="education", weight=0.40)
        factory, session = _mock_session_factory([weight])

        rows = await FacilityConfigRepository(factory).fetch_category_weights()

        assert rows == [weight]
        assert isinstance(rows[0], CategoryWeight)
        assert "ORDER BY category_weights.category" in _compiled_sql(session)


class _FakeRepo:
    """Stands in for FacilityConfigRepository, returning the same model types."""

    def __init__(self, facility_rows: list[dict], category_weight_rows: list[dict]) -> None:
        self._facility_rows = facility_rows
        self._category_weight_rows = category_weight_rows

    async def fetch_facility_types(self) -> list[FacilityType]:
        return [FacilityType(**row) for row in self._facility_rows]

    async def fetch_category_weights(self) -> list[CategoryWeight]:
        return [CategoryWeight(**row) for row in self._category_weight_rows]


class TestLoadScoringConfig:
    async def test_builds_expected_shapes_from_rows(self) -> None:
        repo = _FakeRepo(
            [SCHOOLS_ROW, SUPERMARKETS_ROW],
            [
                {"category": "education", "weight": 0.40},
                {"category": "shopping", "weight": 0.60},
            ],
        )
        config = await load_scoring_config(repo)

        assert set(config.facility_configs) == {"schools", "supermarkets"}
        assert config.facility_configs["schools"].hard_cutoff == 3.0
        assert config.category_facility_weights == {
            "education": {"schools": 0.55},
            "shopping": {"supermarkets": 1.0},
        }
        assert config.category_weights == {"education": 0.40, "shopping": 0.60}
        assert {c.id for c in config.categories} == {"schools", "supermarkets"}
        assert config.category_tags["schools"] == [("amenity", "school")]
        assert config.fetch_radius_km("schools", 10.0) == 3.0
        assert config.default_categories == ["schools", "supermarkets"]

    async def test_category_weights_not_summing_to_one_raises(self) -> None:
        repo = _FakeRepo(
            [SCHOOLS_ROW],
            [{"category": "education", "weight": 0.5}],  # doesn't sum to 1.0 alone
        )
        with pytest.raises(ValueError, match="must sum to 1.0"):
            await load_scoring_config(repo)
