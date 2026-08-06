"""Tests for FacilitiesService's cache-then-batch orchestration (app/services/facilities.py)."""

from unittest.mock import AsyncMock, MagicMock

from app.clients.overpass import OverpassClient
from app.config.scoring_config import FACILITY_CONFIGS
from app.repositories.cache import CacheRepository
from app.services.facilities import FacilitiesService
from tests.conftest import build_test_scoring_config


def _facility_dict(category: str, suffix: str) -> dict:
    return {
        "id": f"osm_node_{category}_{suffix}",
        "name": f"{category} {suffix}",
        "category": category,
        "lat": -36.8,
        "lon": 174.7,
    }


class TestFetchAllBatching:
    async def test_all_categories_full_cache_miss_batches_into_two_calls(self) -> None:
        scoring_config = build_test_scoring_config()
        all_categories = list(FACILITY_CONFIGS.keys())
        assert len(all_categories) == 12

        mock_http = MagicMock()
        mock_http.post = AsyncMock(
            side_effect=[
                MagicMock(
                    raise_for_status=MagicMock(),
                    json=MagicMock(return_value={"elements": []}),
                )
                for _ in range(2)
            ]
        )
        overpass = OverpassClient("http://mock-overpass", mock_http, scoring_config.category_tags)
        cache = CacheRepository(client=None)
        service = FacilitiesService(overpass, cache, scoring_config)

        await service.fetch_all(all_categories, -36.848, 174.763, 5.0)

        assert mock_http.post.call_count == 2

    async def test_default_categories_full_cache_miss_single_call(self) -> None:
        scoring_config = build_test_scoring_config()
        assert len(scoring_config.default_categories) == 5

        mock_http = MagicMock()
        mock_http.post = AsyncMock(
            return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value={"elements": []}),
            )
        )
        overpass = OverpassClient("http://mock-overpass", mock_http, scoring_config.category_tags)
        cache = CacheRepository(client=None)
        service = FacilitiesService(overpass, cache, scoring_config)

        await service.fetch_all(scoring_config.default_categories, -36.848, 174.763, 5.0)

        assert mock_http.post.call_count == 1

    async def test_cache_hits_skip_overpass_and_are_merged_with_misses(self) -> None:
        scoring_config = build_test_scoring_config()
        cache = MagicMock(spec=CacheRepository)

        async def fake_get(key: str):
            if "schools" in key:
                return [_facility_dict("schools", "cached")]
            return None

        cache.get = AsyncMock(side_effect=fake_get)
        cache.set = AsyncMock()

        overpass = MagicMock(spec=OverpassClient)
        overpass.fetch_categories = AsyncMock(
            return_value={"supermarkets": [_facility_dict("supermarkets", "fetched")]}
        )
        service = FacilitiesService(overpass, cache, scoring_config)

        facilities, warnings, failed = await service.fetch_all(
            ["schools", "supermarkets"], -36.848, 174.763, 5.0
        )

        overpass.fetch_categories.assert_awaited_once()
        called_specs = overpass.fetch_categories.await_args.args[0]
        assert [spec[0] for spec in called_specs] == ["supermarkets"]

        categories_returned = {f.category for f in facilities}
        assert categories_returned == {"schools", "supermarkets"}
        assert warnings == []
        assert failed == set()

    async def test_batch_failure_isolates_other_batches(self) -> None:
        scoring_config = build_test_scoring_config()
        cache = CacheRepository(client=None)

        overpass = MagicMock(spec=OverpassClient)

        all_categories = list(FACILITY_CONFIGS.keys())
        assert len(all_categories) == 12  # forces exactly 2 batches of 6

        async def fake_fetch_categories(specs, lat, lon):
            cats = [c for c, _tags, _radius in specs]
            if "schools" in cats:
                raise RuntimeError("overpass down")
            return {c: [_facility_dict(c, "ok")] for c in cats}

        overpass.fetch_categories = AsyncMock(side_effect=fake_fetch_categories)
        service = FacilitiesService(overpass, cache, scoring_config)

        facilities, warnings, failed = await service.fetch_all(
            all_categories, -36.848, 174.763, 5.0
        )

        assert "schools" in failed
        assert any("schools" in w for w in warnings)
        assert facilities  # the other batch's results still came through
        assert all(f.category != "schools" for f in facilities)

    async def test_dedupes_facility_across_batches(self) -> None:
        scoring_config = build_test_scoring_config()
        cache = CacheRepository(client=None)

        overpass = MagicMock(spec=OverpassClient)
        dup = _facility_dict("schools", "dup")

        async def fake_fetch_categories(specs, lat, lon):
            return {c: [dup] for c, _tags, _radius in specs}

        overpass.fetch_categories = AsyncMock(side_effect=fake_fetch_categories)
        service = FacilitiesService(overpass, cache, scoring_config)

        facilities, _warnings, _failed = await service.fetch_all(
            ["schools"], -36.848, 174.763, 5.0
        )

        assert len(facilities) == 1
