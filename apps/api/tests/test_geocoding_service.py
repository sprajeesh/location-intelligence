"""Unit tests for GeocodingService: row -> DTO mapping and the Redis cache round trip."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.models.address import Address
from app.repositories.cache import CacheRepository
from app.schemas.responses import AddressSuggestion
from app.services.geocoding import GeocodingService


def _address(full_address: str = "1 Queen Street, Auckland") -> Address:
    return Address(
        id=1,
        full_address=full_address,
        full_address_ascii=full_address,
        shape_x=Decimal("174.76345678"),
        shape_y=Decimal("-36.84812345"),
    )


def _service(
    rows: list[Address], cached: list | None = None
) -> tuple[GeocodingService, MagicMock, MagicMock]:
    repo = MagicMock()
    repo.search = AsyncMock(return_value=rows)
    cache = MagicMock(spec=CacheRepository)
    cache.get = AsyncMock(return_value=cached)
    cache.set = AsyncMock()
    return GeocodingService(repo, cache), repo, cache


def test_from_model_maps_display_name_and_converts_decimals_to_float() -> None:
    dto = AddressSuggestion.from_model(_address())

    assert dto.displayName == "1 Queen Street, Auckland"
    assert dto.lon == 174.76345678
    assert dto.lat == -36.84812345
    assert isinstance(dto.lat, float)
    assert isinstance(dto.lon, float)


async def test_search_maps_rows_to_dtos_and_caches_plain_dicts() -> None:
    service, _, cache = _service([_address()])

    results = await service.search("queen")

    assert results == [
        AddressSuggestion(
            displayName="1 Queen Street, Auckland", lat=-36.84812345, lon=174.76345678
        )
    ]
    cache.set.assert_awaited_once()
    stored = cache.set.await_args.args[1]
    assert stored == [
        {"displayName": "1 Queen Street, Auckland", "lat": -36.84812345, "lon": 174.76345678}
    ]


async def test_search_does_not_cache_empty_results() -> None:
    service, _, cache = _service([])

    assert await service.search("nowhere") == []
    cache.set.assert_not_awaited()


async def test_search_cache_hit_rebuilds_dtos_without_querying_the_db() -> None:
    cached = [{"displayName": "1 Queen Street, Auckland", "lat": -36.8, "lon": 174.7}]
    service, repo, _ = _service([], cached=cached)

    results = await service.search("queen")

    assert results == [
        AddressSuggestion(displayName="1 Queen Street, Auckland", lat=-36.8, lon=174.7)
    ]
    assert all(isinstance(r, AddressSuggestion) for r in results)
    repo.search.assert_not_awaited()


async def test_geocode_first_returns_first_dto_or_none() -> None:
    service, _, _ = _service([_address("A"), _address("B")])
    first = await service.geocode_first("a")
    assert first is not None and first.displayName == "A"

    empty, _, _ = _service([])
    assert await empty.geocode_first("nowhere") is None
