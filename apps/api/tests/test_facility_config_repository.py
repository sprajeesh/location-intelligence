"""Unit tests for the DB-backed facility config repository and loader.

Mocks the asyncpg pool (matching the pattern used for AddressRepository elsewhere
in this test suite) rather than hitting a real Postgres instance.
"""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config.scoring_config_loader import load_scoring_config
from app.repositories.db.facility_config_repository import FacilityConfigRepository


def _mock_pool(rows: list[dict]) -> MagicMock:
    conn = MagicMock()
    conn.fetch = AsyncMock(return_value=rows)

    acquire_cm = MagicMock()
    acquire_cm.__aenter__ = AsyncMock(return_value=conn)
    acquire_cm.__aexit__ = AsyncMock(return_value=False)

    pool = MagicMock()
    pool.acquire = MagicMock(return_value=acquire_cm)
    return pool


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
    "osm_tags": json.dumps([["amenity", "school"]]),
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
    "osm_tags": json.dumps([["shop", "supermarket"]]),
    "is_default": True,
}


class TestFacilityConfigRepository:
    async def test_fetch_facility_types_parses_osm_tags_jsonb(self) -> None:
        repo = FacilityConfigRepository(_mock_pool([SCHOOLS_ROW]))
        rows = await repo.fetch_facility_types()

        assert len(rows) == 1
        assert rows[0]["slug"] == "schools"
        assert rows[0]["osm_tags"] == [("amenity", "school")]

    async def test_fetch_category_weights(self) -> None:
        repo = FacilityConfigRepository(_mock_pool([{"category": "education", "weight": 0.40}]))
        rows = await repo.fetch_category_weights()

        assert rows == [{"category": "education", "weight": 0.40}]


class _FakeRepo:
    def __init__(self, facility_rows: list[dict], category_weight_rows: list[dict]) -> None:
        self._facility_rows = facility_rows
        self._category_weight_rows = category_weight_rows

    async def fetch_facility_types(self) -> list[dict]:
        return [
            {**row, "osm_tags": [tuple(pair) for pair in json.loads(row["osm_tags"])]}
            for row in self._facility_rows
        ]

    async def fetch_category_weights(self) -> list[dict]:
        return self._category_weight_rows


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
