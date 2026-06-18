import asyncpg


async def create_pool(dsn: str) -> asyncpg.Pool:
    return await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10)


async def close_pool(pool: asyncpg.Pool) -> None:
    await pool.close()
