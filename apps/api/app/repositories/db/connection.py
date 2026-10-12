import re

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def create_engine(dsn: str) -> AsyncEngine:
    """Process-wide SQLAlchemy async engine on the asyncpg driver.

    The engine owns the only connection pool in the app; every repository gets its
    sessions from `create_session_factory`. Accepts both `postgresql://` and
    `postgres://` DSNs.
    """
    # Accept both prefixes: SQLAlchemy 2.x no longer recognises "postgres://".
    url = re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", dsn, count=1)
    return create_async_engine(url, pool_size=5, max_overflow=5)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # Rows are read and mapped to DTOs before the session closes, so keeping
    # attributes loaded after commit is unnecessary.
    return async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()
