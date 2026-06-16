import logging

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_redis_client: aioredis.Redis | None = None


async def get_redis_client(redis_url: str) -> aioredis.Redis | None:
    """Return a connected Redis client, or None if unavailable."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        client = aioredis.from_url(redis_url, decode_responses=True)
        await client.ping()
        _redis_client = client
        logger.info("Redis connected successfully")
        return _redis_client
    except Exception:
        logger.warning("Redis unavailable — caching disabled")
        return None


async def close_redis_client() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection closed")


async def init_redis(redis_url: str) -> None:
    await get_redis_client(redis_url)


async def get_client() -> aioredis.Redis | None:
    return _redis_client
