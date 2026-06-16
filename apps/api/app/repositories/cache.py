import json
import logging

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class CacheRepository:
    def __init__(self, client: aioredis.Redis | None) -> None:
        self._client = client

    async def get(self, key: str) -> dict | list | None:
        if self._client is None:
            return None
        try:
            raw = await self._client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Cache get failed for key %s: %s", key, exc)
            return None

    async def set(self, key: str, value: dict | list, ttl_seconds: int) -> None:
        if self._client is None:
            return
        try:
            await self._client.set(key, json.dumps(value), ex=ttl_seconds)
        except Exception as exc:
            logger.warning("Cache set failed for key %s: %s", key, exc)
