import re

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def create_engine(dsn: str, *, pool_size: int, max_overflow: int) -> AsyncEngine:
    """Process-wide SQLAlchemy async engine on the asyncpg driver.

    The engine owns the only connection pool in the app; every repository gets its
    sessions from `create_session_factory`. Accepts both `postgresql://` and
    `postgres://` DSNs. Pool sizes come from Settings (`db_pool_size`,
    `db_pool_max_overflow`).
    """
    # Accept both prefixes: SQLAlchemy 2.x no longer recognises "postgres://".
    url = re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", dsn, count=1)
    return create_async_engine(url, pool_size=pool_size, max_overflow=max_overflow)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # Rows are read and mapped to DTOs before the session closes, so keeping
    # attributes loaded after commit is unnecessary.
    return async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()
