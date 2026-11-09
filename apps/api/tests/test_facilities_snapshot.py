"""FacilitiesService routing between the local POI snapshot and Overpass."""

from unittest.mock import AsyncMock, MagicMock

from app.clients.overpass import OverpassClient
from app.repositories.cache import CacheRepository
from app.repositories.db.poi_snapshot_repository import PoiSnapshotRepository
from app.services.facilities import FacilitiesService
from tests.conftest import build_test_scoring_config

ALL_SCHOOL_PAIRS = frozenset({("amenity", "school")})


def _school_element() -> dict:
    return {
        "type": "node",
        "id": 1001,
        "lat": -36.85,
        "lon": 174.76,
        "tags": {"amenity": "school", "name": "Snapshot School"},
    }


def _service(
    snapshot_pairs: frozenset[tuple[str, str]],
    snapshot_elements: list[dict] | None = None,
    snapshot_error: Exception | None = None,
    with_snapshot: bool = True,
) -> tuple[FacilitiesService, MagicMock, MagicMock, MagicMock]:
    scoring_config = build_test_scoring_config()

    overpass = MagicMock(spec=OverpassClient)
    overpass.fetch_categories = AsyncMock(return_value={})

    cache = MagicMock(spec=CacheRepository)
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()

    poi = MagicMock(spec=PoiSnapshotRepository)
    if snapshot_error is not None:
        poi.find_elements_near = AsyncMock(side_effect=snapshot_error)
    else:
        poi.find_elements_near = AsyncMock(return_value=snapshot_elements or [])

    service = FacilitiesService(
        overpass,
        cache,
        scoring_config,
        poi_snapshot=poi if with_snapshot else None,
        snapshot_pairs=snapshot_pairs,
    )
    return service, overpass, cache, poi


async def test_fully_covered_category_is_served_from_snapshot_only() -> None:
    service, overpass, cache, poi = _service(
        ALL_SCHOOL_PAIRS, snapshot_elements=[_school_element()]
    )

    facilities, warnings, failed = await service.fetch_all(["schools"], -36.85, 174.76, 2.0)

    assert [f.name for f in facilities] == ["Snapshot School"]
    assert warnings == [] and failed == set()
    poi.find_elements_near.assert_awaited_once()
    overpass.fetch_categories.assert_not_awaited()
    cache.get.assert_not_awaited()  # snapshot path does not use the Redis cache


async def test_partially_covered_category_falls_back_to_overpass() -> None:
    # bus_stops needs two pairs; only one is in the snapshot.
    service, overpass, _cache, poi = _service(frozenset({("highway", "bus_stop")}))
    overpass.fetch_categories = AsyncMock(return_value={"bus_stops": []})

    await service.fetch_all(["bus_stops"], -36.85, 174.76, 2.0)

    poi.find_elements_near.assert_not_awaited()
    overpass.fetch_categories.assert_awaited_once()


async def test_no_snapshot_means_every_category_uses_overpass() -> None:
    service, overpass, _cache, poi = _service(frozenset(), with_snapshot=False)
    overpass.fetch_categories = AsyncMock(return_value={"schools": []})

    await service.fetch_all(["schools"], -36.85, 174.76, 2.0)

    poi.find_elements_near.assert_not_awaited()
    overpass.fetch_categories.assert_awaited_once()


async def test_empty_manifest_pairs_means_overpass() -> None:
    service, overpass, _cache, poi = _service(frozenset(), snapshot_elements=[_school_element()])
    overpass.fetch_categories = AsyncMock(return_value={"schools": []})

    await service.fetch_all(["schools"], -36.85, 174.76, 2.0)

    poi.find_elements_near.assert_not_awaited()
    overpass.fetch_categories.assert_awaited_once()


async def test_snapshot_query_failure_marks_only_that_category_failed() -> None:
    service, overpass, _cache, _poi = _service(
        ALL_SCHOOL_PAIRS, snapshot_error=RuntimeError("db down")
    )
    overpass.fetch_categories = AsyncMock(return_value={"supermarkets": []})

    facilities, warnings, failed = await service.fetch_all(
        ["schools", "supermarkets"], -36.85, 174.76, 2.0
    )

    assert facilities == []
    assert failed == {"schools"}
    assert "Could not fetch schools data" in warnings
    # The Overpass path for the other category is unaffected by the snapshot error.
    overpass.fetch_categories.assert_awaited_once()
    assert overpass.fetch_categories.await_args.args[0][0][0] == "supermarkets"
