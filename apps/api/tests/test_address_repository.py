"""Unit tests for AddressRepository.

The session factory is mocked, so these check the statement that is built
(filters, ordering, limit, input normalisation) and the rows that come back,
not the database itself.
"""

from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.dialects import postgresql

from app.models.address import Address
from app.repositories.db.address_repository import AddressRepository


def _mock_session_factory(rows: list[Address]) -> tuple[MagicMock, MagicMock]:
    session = MagicMock()
    session.scalars = AsyncMock(return_value=rows)

    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session)
    cm.__aexit__ = AsyncMock(return_value=False)

    factory = MagicMock(return_value=cm)
    return factory, session


def _compiled(session: MagicMock) -> tuple[str, dict]:
    """SQL text plus bound parameters, so `%` wildcards are compared as values, not escaped text."""
    stmt = session.scalars.call_args.args[0]
    compiled = stmt.compile(dialect=postgresql.dialect())
    return str(compiled), compiled.params


async def test_search_returns_address_models() -> None:
    row = Address(
        id=1, full_address="1 Queen Street, Auckland", full_address_ascii="1 queen street, auckland"
    )
    factory, _ = _mock_session_factory([row])

    result = await AddressRepository(factory).search("queen")

    assert result == [row]
    assert isinstance(result[0], Address)


async def test_search_filters_on_ascii_ilike_and_non_null_coordinates() -> None:
    factory, session = _mock_session_factory([])

    await AddressRepository(factory).search("queen")

    sql, params = _compiled(session)
    assert "full_address_ascii ILIKE" in sql
    assert "%queen%" in params.values()
    assert "addresses.shape_x IS NOT NULL" in sql
    assert "addresses.shape_y IS NOT NULL" in sql


async def test_search_orders_prefix_matches_first_then_by_length_and_limits() -> None:
    factory, session = _mock_session_factory([])

    await AddressRepository(factory).search("queen", limit=3)

    sql, params = _compiled(session)
    assert "CASE WHEN" in sql
    assert {0, 1} <= set(params.values())
    assert "queen%" in params.values()
    assert "length(addresses.full_address_ascii)" in sql
    assert "LIMIT" in sql
    assert 3 in params.values()


async def test_search_strips_macrons_before_matching() -> None:
    factory, session = _mock_session_factory([])

    await AddressRepository(factory).search("Māngere")

    _, params = _compiled(session)
    assert "%Mangere%" in params.values()
    assert not any("ā" in str(v) for v in params.values())


async def test_search_passes_user_input_as_a_bound_parameter() -> None:
    factory, session = _mock_session_factory([])

    await AddressRepository(factory).search("x'; DROP TABLE addresses; --")

    sql, params = _compiled(session)
    assert "DROP TABLE" not in sql
    assert any("DROP TABLE" in str(v) for v in params.values())
