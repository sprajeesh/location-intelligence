import pytest

from app.repositories.db import connection
from app.repositories.db.connection import create_engine


@pytest.mark.parametrize("dsn", ["postgresql://u:p@localhost/gis", "postgres://u:p@localhost/gis"])
def test_create_engine_uses_asyncpg_for_both_dsn_prefixes(dsn: str) -> None:
    engine = create_engine(dsn, pool_size=5, max_overflow=5)
    assert engine.url.drivername == "postgresql+asyncpg"
    assert engine.url.database == "gis"
    assert engine.url.host == "localhost"


def test_create_engine_passes_pool_sizes_to_sqlalchemy(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict] = []

    def fake_create_async_engine(url: str, **kwargs: object) -> object:
        calls.append(kwargs)
        return object()

    monkeypatch.setattr(connection, "create_async_engine", fake_create_async_engine)
    create_engine("postgresql://u:p@localhost/gis", pool_size=3, max_overflow=7)
    assert calls == [
        {"pool_size": 3, "max_overflow": 7, "pool_pre_ping": True, "pool_recycle": 1800}
    ]
