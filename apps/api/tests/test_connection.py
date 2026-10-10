import pytest

from app.repositories.db.connection import create_engine


@pytest.mark.parametrize("dsn", ["postgresql://u:p@localhost/gis", "postgres://u:p@localhost/gis"])
def test_create_engine_uses_asyncpg_for_both_dsn_prefixes(dsn: str) -> None:
    engine = create_engine(dsn)
    assert engine.url.drivername == "postgresql+asyncpg"
    assert engine.url.database == "gis"
    assert engine.url.host == "localhost"
