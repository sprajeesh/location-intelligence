from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyze, categories, health, search
from app.api.deps import verify_api_key
from app.clients import redis_client as redis_module
from app.clients.circuit_breaker import CircuitBreaker
from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.config.scoring_config_loader import load_scoring_config
from app.config.settings import get_settings
from app.config.version import get_version
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.repositories.db.connection import close_pool, create_pool
from app.repositories.db.facility_config_repository import FacilityConfigRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.scoring import LocationScoringService


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()

    # Connect Redis (graceful skip if unavailable)
    await redis_module.init_redis(settings.redis_url)
    redis_client = await redis_module.get_client()
    cache = CacheRepository(redis_client)

    # Connect PostGIS
    db_pool = await create_pool(settings.database_url)

    # Load facility/scoring config from the DB once at startup — see
    # app/config/scoring_config_loader.py. Picking up an edit requires a restart.
    scoring_config = await load_scoring_config(FacilityConfigRepository(db_pool))
    app.state.scoring_config = scoring_config

    # Shared HTTP client for Overpass and OSRM
    http_client = httpx.AsyncClient()

    # Circuit breakers -- fail fast after repeated consecutive failures rather
    # than paying each client's full timeout/retry cost on every request
    # during a real outage (see app/clients/circuit_breaker.py).
    overpass_breaker = CircuitBreaker(
        "overpass",
        failure_threshold=settings.overpass_breaker_failure_threshold,
        cooldown_seconds=settings.overpass_breaker_cooldown_seconds,
    )
    osrm_breaker = CircuitBreaker(
        "osrm",
        failure_threshold=settings.osrm_breaker_failure_threshold,
        cooldown_seconds=settings.osrm_breaker_cooldown_seconds,
    )

    # Wire up clients
    overpass = OverpassClient(
        settings.overpass_url,
        http_client,
        scoring_config.category_tags,
        max_concurrency=settings.overpass_max_concurrency,
        breaker=overpass_breaker,
    )
    osrm = OSRMClient(
        settings.osrm_url,
        http_client,
        max_concurrency=settings.osrm_max_concurrency,
        breaker=osrm_breaker,
    )

    # Wire up services
    app.state.geocoding_svc = GeocodingService(AddressRepository(db_pool), cache)
    app.state.facilities_svc = FacilitiesService(overpass, cache, scoring_config)
    app.state.distance_svc = DistanceService(osrm, cache, scoring_config.facility_configs)
    app.state.scoring_svc = LocationScoringService(
        scoring_config.facility_configs,
        scoring_config.category_facility_weights,
        scoring_config.category_weights,
    )

    yield

    # Cleanup
    await close_pool(db_pool)
    await http_client.aclose()
    await redis_module.close_redis_client()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Location Intelligence API",
        version=get_version(),
        description="API for location-based facility and scoring analysis",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # health stays unauthenticated -- the docker-compose healthcheck (and any
    # external uptime monitor) doesn't have the shared secret.
    app.include_router(health.router)
    app.include_router(search.router, dependencies=[Depends(verify_api_key)])
    app.include_router(categories.router, dependencies=[Depends(verify_api_key)])
    app.include_router(analyze.router, dependencies=[Depends(verify_api_key)])

    return app


app = create_app()
