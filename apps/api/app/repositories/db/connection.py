import asyncpg
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


async def create_pool(dsn: str) -> asyncpg.Pool:
    return await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10)


async def close_pool(pool: asyncpg.Pool) -> None:
    await pool.close()


def create_engine(dsn: str) -> AsyncEngine:
    """SQLAlchemy async engine on the asyncpg driver.

    Takes the same plain `postgresql://` DSN as `create_pool`. Kept small
    because it sits alongside the asyncpg pool rather than replacing it.
    """
    url = dsn.replace("postgresql://", "postgresql+asyncpg://", 1)
    return create_async_engine(url, pool_size=5, max_overflow=5)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # Rows are read and mapped to DTOs before the session closes, so keeping
    # attributes loaded after commit is unnecessary.
    return async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine(engine: AsyncEngine) -> None:
    await engine.dispose()
