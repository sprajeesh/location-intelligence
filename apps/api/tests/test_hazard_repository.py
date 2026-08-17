"""Unit tests for the DB-backed hazard repository.

Mocks the asyncpg pool, matching the pattern used for
FacilityConfigRepository elsewhere in this test suite, rather than hitting a
real Postgres instance.
"""

from unittest.mock import AsyncMock, MagicMock

from app.repositories.db.hazard_repository import HazardRepository


def _mock_pool(rows: list[dict]) -> MagicMock:
    conn = MagicMock()
    conn.fetch = AsyncMock(return_value=rows)

    acquire_cm = MagicMock()
    acquire_cm.__aenter__ = AsyncMock(return_value=conn)
    acquire_cm.__aexit__ = AsyncMock(return_value=False)

    pool = MagicMock()
    pool.acquire = MagicMock(return_value=acquire_cm)
    return pool


class TestHazardRepository:
    async def test_fetch_hazard_types(self) -> None:
        rows = [
            {
                "slug": "demo_hazard",
                "label": "Demo Hazard",
                "color": "#b2182b",
                "description": "scaffold placeholder",
                "default_weight": 1.0,
                "severe_threshold": 80.0,
                "is_proxy": True,
                "implemented": True,
            }
        ]
        repo = HazardRepository(_mock_pool(rows))

        result = await repo.fetch_hazard_types()

        assert result == rows

    async def test_fetch_cell_scores(self) -> None:
        rows = [
            {
                "hazard_type_slug": "demo_hazard",
                "score": 42.5,
                "severe": False,
                "data_currency_date": "2026-08-01",
                "source_name": "Phase-0 Scaffold Dummy Generator",
                "licence": "N/A",
            }
        ]
        repo = HazardRepository(_mock_pool(rows))

        result = await repo.fetch_cell_scores("8752c9adfffffff")

        assert result == rows

    async def test_fetch_cell_scores_empty_when_no_coverage(self) -> None:
        repo = HazardRepository(_mock_pool([]))

        result = await repo.fetch_cell_scores("8752c9adfffffff")

        assert result == []

    async def test_fetch_cells_in_bbox_passes_default_limit(self) -> None:
        pool = _mock_pool([])
        repo = HazardRepository(pool)

        await repo.fetch_cells_in_bbox(174.7, -36.9, 174.8, -36.8)

        conn = pool.acquire.return_value.__aenter__.return_value
        args = conn.fetch.call_args.args
        assert args[1:] == (174.7, -36.9, 174.8, -36.8, 10_000)

    async def test_fetch_cells_in_bbox_passes_custom_limit(self) -> None:
        pool = _mock_pool([])
        repo = HazardRepository(pool)

        await repo.fetch_cells_in_bbox(174.7, -36.9, 174.8, -36.8, limit=50)

        conn = pool.acquire.return_value.__aenter__.return_value
        args = conn.fetch.call_args.args
        assert args[1:] == (174.7, -36.9, 174.8, -36.8, 50)
