import re

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Seconds before a pooled connection is replaced. Keeps us ahead of idle-timeout
# drops from NAT gateways and load balancers, which vary by provider (some as low
# as a few minutes), and would otherwise surface as failed requests.
POOL_RECYCLE_SECONDS = 1800


def create_engine(dsn: str, *, pool_size: int, max_overflow: int) -> AsyncEngine:
    """Process-wide SQLAlchemy async engine on the asyncpg driver.

    The engine owns the only connection pool in the app; every repository gets its
    sessions from `create_session_factory`. Accepts both `postgresql://` and
    `postgres://` DSNs. Pool sizes come from Settings (`db_pool_size`,
    `db_pool_max_overflow`).

    Each checkout is pinged first (`pool_pre_ping`), so a connection that died
    during a database restart or failover is discarded instead of failing the
    request that picked it up.
    """
    # Accept both prefixes: SQLAlchemy 2.x no longer recognises "postgres://".
    url = re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", dsn, count=1)
    return create_async_engine(
        url,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=True,
        pool_recycle=POOL_RECYCLE_SECONDS,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # Rows are read and mapped to DTOs before the session closes, so keeping
    # attributes loaded after commit is unnecessary.
    return async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()
