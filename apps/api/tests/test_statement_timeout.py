"""Server-side statement_timeout: classification, repository mapping, API responses.

The live PostgreSQL test at the bottom is skipped when no database is reachable,
so the rest of the suite still runs without one.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.config.settings import get_settings
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.repositories.db.connection import create_engine, create_session_factory
from app.repositories.db.errors import QueryTimeoutError, is_query_timeout
from app.services.geocoding import GeocodingService


class _FakeDriverError(Exception):
    """Stands in for the asyncpg error that SQLAlchemy wraps; only `sqlstate` matters."""

    def __init__(self, sqlstate: str) -> None:
        super().__init__(sqlstate)
        self.sqlstate = sqlstate


def _dbapi_error(sqlstate: str) -> DBAPIError:
    return DBAPIError("SELECT 1", {}, _FakeDriverError(sqlstate))


def _session_factory_raising(exc: BaseException) -> MagicMock:
    session = MagicMock()
    session.scalars = AsyncMock(side_effect=exc)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=cm)


# --- classification -------------------------------------------------------------


def test_is_query_timeout_recognises_query_canceled_sqlstate() -> None:
    assert is_query_timeout(_dbapi_error("57014"))


def test_is_query_timeout_ignores_other_database_errors() -> None:
    # 42P01 undefined_table, 08006 connection_failure
    assert not is_query_timeout(_dbapi_error("42P01"))
    assert not is_query_timeout(_dbapi_error("08006"))


def test_is_query_timeout_ignores_non_database_exceptions() -> None:
    assert not is_query_timeout(TimeoutError())


# --- repository mapping ---------------------------------------------------------


async def test_repository_maps_statement_timeout_to_query_timeout_error() -> None:
    factory = _session_factory_raising(_dbapi_error("57014"))

    with pytest.raises(QueryTimeoutError):
        await AddressRepository(factory).search("queen")


async def test_repository_propagates_other_database_errors_unchanged() -> None:
    original = _dbapi_error("42P01")
    factory = _session_factory_raising(original)

    with pytest.raises(DBAPIError) as raised:
        await AddressRepository(factory).search("queen")

    assert raised.value is original


async def test_geocoding_service_lets_query_timeout_error_through() -> None:
    repo = MagicMock(spec=AddressRepository)
    repo.search = AsyncMock(side_effect=QueryTimeoutError("slow"))
    service = GeocodingService(repo, CacheRepository(client=None))

    with pytest.raises(QueryTimeoutError):
        await service.search("queen")


# --- API responses --------------------------------------------------------------


def _timing_out_geocoder(client) -> None:  # type: ignore[no-untyped-def]
    repo = MagicMock(spec=AddressRepository)
    repo.search = AsyncMock(side_effect=QueryTimeoutError("slow"))
    client.app.state.geocoding_svc = GeocodingService(repo, CacheRepository(client=None))


def test_search_returns_504_when_query_times_out(test_client) -> None:  # type: ignore[no-untyped-def]
    _timing_out_geocoder(test_client)

    response = test_client.get("/search/address?q=queen")

    assert response.status_code == 504
    assert response.json()["detail"].startswith("Address search timed out")


def test_analyze_returns_504_when_address_lookup_times_out(test_client) -> None:  # type: ignore[no-untyped-def]
    _timing_out_geocoder(test_client)

    # Rate limits persist in Redis across runs, so use a fresh caller IP each time.
    caller_ip = f"198.51.100.{uuid.uuid4().int % 250 + 1}"
    response = test_client.post(
        "/location/analyze",
        json={"address": "1 Queen Street"},
        headers={"X-Forwarded-Client-Ip": caller_ip},
    )

    assert response.status_code == 504
    assert response.json()["detail"].startswith("Address lookup timed out")


# --- live PostgreSQL ------------------------------------------------------------


@pytest.fixture
async def live_session_factory():  # type: ignore[no-untyped-def]
    """Engine with a 100ms statement_timeout against the configured database."""
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        pool_size=1,
        max_overflow=0,
        pool_recycle_seconds=settings.db_pool_recycle_seconds,
        statement_timeout_ms=100,
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:  # no database reachable -- skip rather than fail
        await engine.dispose()
        pytest.skip(f"PostgreSQL not reachable: {type(exc).__name__}")

    yield create_session_factory(engine)
    await engine.dispose()


async def test_live_connection_has_statement_timeout_applied(live_session_factory) -> None:  # type: ignore[no-untyped-def]
    async with live_session_factory() as session:
        value = (await session.execute(text("SHOW statement_timeout"))).scalar()

    assert value == "100ms"


async def test_live_slow_query_is_cancelled_by_postgres(live_session_factory) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(DBAPIError) as raised:
        async with live_session_factory() as session:
            await session.execute(text("SELECT pg_sleep(2)"))

    assert is_query_timeout(raised.value)
