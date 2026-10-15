"""Map corrections: schema constraints and repository, against live PostGIS.

These run against the configured database (migration 0008 applied). They are
skipped when no database is reachable, so the unit-test job still passes
without Docker. Every row is tagged with a per-test client hash and removed
afterwards.
"""

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.config.settings import get_settings
from app.repositories.db.connection import create_engine, create_session_factory
from app.repositories.db.map_correction_repository import MapCorrectionRepository

# Auckland CBD, longitude first in every tuple below.
LON = 174.763
LAT = -36.848
# Roughly 50 m and 200 m north of the reference point (1 degree latitude ≈ 111.3 km).
LAT_50M = LAT + 50 / 111_320
LAT_200M = LAT + 200 / 111_320


@pytest.fixture
async def session_factory():  # type: ignore[no-untyped-def]
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        pool_size=1,
        max_overflow=0,
        pool_recycle_seconds=settings.db_pool_recycle_seconds,
        statement_timeout_ms=settings.db_statement_timeout_ms,
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1 FROM map_corrections LIMIT 0"))
    except Exception as exc:  # no database, or migration 0008 not applied
        await engine.dispose()
        pytest.skip(f"map_corrections not reachable: {type(exc).__name__}")

    factory = create_session_factory(engine)
    yield factory

    async with factory() as session, session.begin():
        await session.execute(
            text("DELETE FROM map_corrections WHERE client_ip_hash LIKE 'test-%'")
        )
    await engine.dispose()


@pytest.fixture
def client_hash() -> str:
    return f"test-{uuid.uuid4()}"


@pytest.fixture
def repo(session_factory) -> MapCorrectionRepository:  # type: ignore[no-untyped-def]
    return MapCorrectionRepository(session_factory)


def _add_kwargs(client_hash: str, **overrides: object) -> dict:
    kwargs: dict = {
        "correction_type": "add",
        "facility_type_slug": "schools",
        "lat": LAT,
        "lon": LON,
        "client_ip_hash": client_hash,
        "name": "Test School",
        "address": "1 Test Street",
    }
    kwargs.update(overrides)
    return kwargs


def _remove_kwargs(client_hash: str, **overrides: object) -> dict:
    kwargs: dict = {
        "correction_type": "remove",
        "facility_type_slug": "schools",
        "lat": LAT,
        "lon": LON,
        "client_ip_hash": client_hash,
        "target_osm_id": "node/12345",
        "reason": "closed",
    }
    kwargs.update(overrides)
    return kwargs


# --- valid rows -----------------------------------------------------------------


async def test_insert_add_returns_row_with_server_defaults(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    row = await repo.insert(**_add_kwargs(client_hash))

    assert isinstance(row.id, uuid.UUID)
    assert row.status == "pending"
    assert row.report_count == 1
    assert row.dedupe_checked is True
    assert row.created_at is not None
    assert row.reviewed_at is None


async def test_insert_remove_round_trips_fields(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    row = await repo.insert(**_remove_kwargs(client_hash))

    assert row.correction_type == "remove"
    assert row.target_osm_id == "node/12345"
    assert row.reason == "closed"
    assert row.name is None
    assert row.address is None


async def test_geom_round_trips_longitude_first(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    row = await repo.insert(**_add_kwargs(client_hash))

    assert row.lon == pytest.approx(LON, abs=1e-6)
    assert row.lat == pytest.approx(LAT, abs=1e-6)


# --- database-enforced rules ----------------------------------------------------


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"target_osm_id": None}, id="remove-without-target"),
        pytest.param({"reason": None}, id="remove-without-reason"),
        pytest.param({"name": "Oops"}, id="remove-with-name"),
        pytest.param({"address": "1 Oops Street"}, id="remove-with-address"),
        pytest.param({"reason": "bogus"}, id="remove-unknown-reason"),
    ],
)
async def test_invalid_remove_rows_are_rejected(repo, client_hash, overrides) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(IntegrityError):
        await repo.insert(**_remove_kwargs(client_hash, **overrides))


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"target_osm_id": "node/1"}, id="add-with-target"),
        pytest.param({"reason": "closed"}, id="add-with-reason"),
        pytest.param({"correction_type": "edit"}, id="unknown-type"),
        pytest.param({"name": "x" * 201}, id="name-too-long"),
        pytest.param({"address": "x" * 301}, id="address-too-long"),
        pytest.param({"reporter_email": "x" * 255}, id="email-too-long"),
        pytest.param({"facility_type_slug": "not_a_real_type"}, id="unknown-facility-type"),
    ],
)
async def test_invalid_add_rows_are_rejected(repo, client_hash, overrides) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(IntegrityError):
        await repo.insert(**_add_kwargs(client_hash, **overrides))


async def test_zero_report_count_is_rejected(session_factory, client_hash) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(IntegrityError):
        async with session_factory() as session, session.begin():
            await session.execute(
                text(
                    "INSERT INTO map_corrections "
                    "(correction_type, facility_type_slug, geom, client_ip_hash, report_count) "
                    "VALUES ('add', 'schools', "
                    "ST_GeogFromText('SRID=4326;POINT(174.763 -36.848)'), :hash, 0)"
                ),
                {"hash": client_hash},
            )


# --- find_pending_add_near ------------------------------------------------------


async def test_find_pending_add_matches_within_radius_only(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    row = await repo.insert(**_add_kwargs(client_hash))

    near = await repo.find_pending_add_near("schools", LAT_50M, LON, radius_m=100)
    far = await repo.find_pending_add_near("schools", LAT_200M, LON, radius_m=100)

    assert row.id in {r.id for r in near}
    assert row.id not in {r.id for r in far}


async def test_find_pending_add_matches_at_zero_distance(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    row = await repo.insert(**_add_kwargs(client_hash))

    found = await repo.find_pending_add_near("schools", LAT, LON, radius_m=50)

    assert row.id in {r.id for r in found}


async def test_find_pending_add_ignores_other_facility_types_and_statuses(
    repo, session_factory, client_hash
) -> None:  # type: ignore[no-untyped-def]
    other_type = await repo.insert(**_add_kwargs(client_hash, facility_type_slug="gps"))
    rejected = await repo.insert(**_add_kwargs(client_hash))
    async with session_factory() as session, session.begin():
        await session.execute(
            text("UPDATE map_corrections SET status = 'rejected' WHERE id = :id"),
            {"id": rejected.id},
        )

    found = await repo.find_pending_add_near("schools", LAT, LON, radius_m=50)

    assert other_type.id not in {r.id for r in found}
    assert rejected.id not in {r.id for r in found}


async def test_find_pending_add_orders_nearest_first(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    far = await repo.insert(**_add_kwargs(client_hash, lat=LAT_200M))
    near = await repo.insert(**_add_kwargs(client_hash, lat=LAT_50M))

    found = await repo.find_pending_add_near("schools", LAT, LON, radius_m=500)

    ids = [r.id for r in found if r.id in {near.id, far.id}]
    assert ids == [near.id, far.id]


# --- find_pending_remove_for_target ---------------------------------------------


async def test_find_pending_remove_matches_only_pending_same_target(
    repo, session_factory, client_hash
) -> None:  # type: ignore[no-untyped-def]
    pending = await repo.insert(**_remove_kwargs(client_hash, target_osm_id="node/777"))
    rejected = await repo.insert(**_remove_kwargs(client_hash, target_osm_id="node/777"))
    other_target = await repo.insert(**_remove_kwargs(client_hash, target_osm_id="node/888"))
    async with session_factory() as session, session.begin():
        await session.execute(
            text("UPDATE map_corrections SET status = 'rejected' WHERE id = :id"),
            {"id": rejected.id},
        )

    found = await repo.find_pending_remove_for_target("node/777")

    ids = {r.id for r in found}
    assert pending.id in ids
    assert rejected.id not in ids
    assert other_target.id not in ids


async def test_find_pending_remove_ignores_add_rows(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    add = await repo.insert(**_add_kwargs(client_hash))

    found = await repo.find_pending_remove_for_target("node/12345")

    assert add.id not in {r.id for r in found}


# --- increment_report_count -----------------------------------------------------


async def test_increment_report_count_returns_new_count(repo, client_hash) -> None:  # type: ignore[no-untyped-def]
    row = await repo.insert(**_add_kwargs(client_hash))

    assert await repo.increment_report_count(row.id) == 2
    assert await repo.increment_report_count(row.id) == 3


async def test_increment_report_count_returns_none_for_unknown_id(repo) -> None:  # type: ignore[no-untyped-def]
    assert await repo.increment_report_count(uuid.uuid4()) is None
