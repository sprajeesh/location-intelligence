import logging
from collections.abc import Awaitable, Callable
from math import ceil

import redis.exceptions
from fastapi import HTTPException, Request, Response
from fastapi_limiter import FastAPILimiter

from app.logging_config import exception_fields

logger = logging.getLogger(__name__)


def client_ip(request: Request) -> str:
    """The visitor IP the Next.js BFF asserts via X-Forwarded-Client-Ip (see
    apps/web/src/utils/clientIp.ts) -- Caddy's own X-Forwarded-For would only
    ever show the BFF's shared egress IP. Falls back to the raw connecting IP
    for local dev / direct calls that bypass the BFF."""
    ip = request.headers.get("x-forwarded-client-ip")
    if not ip:
        ip = request.client.host if request.client else "unknown"
    return ip


async def bff_client_identifier(request: Request) -> str:
    """Rate-limit key: the caller IP (see client_ip) plus the request path, so
    each route has its own bucket per caller."""
    return f"{client_ip(request)}:{request.scope['path']}"


async def rate_limit_exceeded(request: Request, response: Response, pexpire: int) -> None:
    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please slow down.",
        headers={"Retry-After": str(ceil(pexpire / 1000))},
    )


def rate_limiter(times: int, seconds: int) -> Callable[[Request, Response], Awaitable[None]]:
    """Builds a per-route rate-limit dependency.

    This deliberately doesn't use fastapi_limiter.depends.RateLimiter
    directly: its __call__ walks `request.app.routes` assuming every route
    exposes a flat `.path`/`.methods` pair, which no longer holds against the
    FastAPI version this project resolves to (confirmed by testing --
    AttributeError: '_IncludedRouter' object has no attribute 'path').
    Instead this reimplements just RateLimiter._check's Lua-script call,
    which is all fastapi_limiter==0.1.6 actually needs for correctness here --
    route/dependency-slot disambiguation isn't needed since each router in
    this app has exactly one rate_limiter() dependency, and
    bff_client_identifier already namespaces the key by request path.

    Fails open if Redis (and therefore FastAPILimiter) is unavailable --
    every other Redis touchpoint in this app (CacheRepository,
    get_redis_client()) already fails open the same way.

    TODO: Switch back to fastapi_limiter.depends.RateLimiter once a release
    compatible with this project's resolved FastAPI version ships.
    """

    async def dependency(request: Request, response: Response) -> None:
        await enforce_rate_limit(request, response, times, seconds)

    return dependency


async def enforce_rate_limit(
    request: Request,
    response: Response,
    times: int,
    seconds: int,
    *,
    scope: str | None = None,
) -> None:
    """Counts this request against `times` per `seconds` for the caller and raises
    429 when the limit is exceeded. `scope` splits one route into several buckets,
    for routes whose limit depends on the request body (see map_corrections).
    Fails open exactly as rate_limiter() does."""
    if FastAPILimiter.redis is None:
        return

    rate_key = await bff_client_identifier(request)
    if scope is not None:
        rate_key = f"{rate_key}#{scope}"
    key = f"{FastAPILimiter.prefix}:{rate_key}"
    milliseconds = seconds * 1000

    try:
        try:
            pexpire = await FastAPILimiter.redis.evalsha(
                FastAPILimiter.lua_sha, 1, key, str(times), str(milliseconds)
            )
        except redis.exceptions.NoScriptError:
            FastAPILimiter.lua_sha = await FastAPILimiter.redis.script_load(
                FastAPILimiter.lua_script
            )
            pexpire = await FastAPILimiter.redis.evalsha(
                FastAPILimiter.lua_sha, 1, key, str(times), str(milliseconds)
            )
    except redis.exceptions.RedisError as exc:
        # The key embeds the caller identifier, so it is not logged.
        logger.warning(
            "Rate limiting failed open -- Redis error",
            extra={"event": "rate_limit.fail_open", **exception_fields(exc)},
        )
        return

    if pexpire != 0:
        await rate_limit_exceeded(request, response, pexpire)
