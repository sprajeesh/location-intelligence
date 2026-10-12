import re

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def create_engine(
    dsn: str,
    *,
    pool_size: int,
    max_overflow: int,
    pool_recycle_seconds: int,
    statement_timeout_ms: int,
) -> AsyncEngine:
    """Process-wide SQLAlchemy async engine on the asyncpg driver.

    The engine owns the only connection pool in the app; every repository gets its
    sessions from `create_session_factory`. Accepts both `postgresql://` and
    `postgres://` DSNs. Pool sizes come from Settings (`db_pool_size`,
    `db_pool_max_overflow`).

    Each checkout is pinged first (`pool_pre_ping`), so a connection that died
    during a database restart or failover is discarded instead of failing the
    request that picked it up.

    Every connection is opened with `statement_timeout` set server-side, so a
    runaway query is cancelled by PostgreSQL rather than holding a pooled
    connection. Callers see the cancellation as described in `errors.py`.
    """
    # Accept both prefixes: SQLAlchemy 2.x no longer recognises "postgres://".
    url = re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", dsn, count=1)
    return create_async_engine(
        url,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=True,
        pool_recycle=pool_recycle_seconds,
        # asyncpg takes server settings as strings; Postgres reads the value in ms.
        connect_args={"server_settings": {"statement_timeout": str(statement_timeout_ms)}},
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # Rows are read and mapped to DTOs before the session closes, so keeping
    # attributes loaded after commit is unnecessary.
    return async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()
