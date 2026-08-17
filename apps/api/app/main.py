import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter

from app.api import analyze, categories, hazard, health, search
from app.api.concurrency import InFlightLimiter, analyze_capacity_guard
from app.api.deps import verify_api_key
from app.api.rate_limit import bff_client_identifier, rate_limit_exceeded, rate_limiter
from app.clients import redis_client as redis_module
from app.clients.circuit_breaker import CircuitBreaker
from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.config.hazard_config_loader import load_hazard_config
from app.config.scoring_config_loader import load_scoring_config
from app.config.settings import get_settings
from app.config.version import get_version
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.repositories.db.connection import close_pool, create_pool
from app.repositories.db.facility_config_repository import FacilityConfigRepository
from app.repositories.db.hazard_repository import HazardRepository
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.hazard_scoring import HazardScoringService
from app.services.scoring import LocationScoringService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()

    # Connect Redis (graceful skip if unavailable)
    await redis_module.init_redis(settings.redis_url)
    redis_client = await redis_module.get_client()
    cache = CacheRepository(redis_client)

    # Rate limiting (app/api/rate_limit.py) -- fails open via rate_limiter()'s
    # wrapper when Redis is unavailable, so only enable the library's own
    # atomic Lua script when there's a real connection to run it on.
    if redis_client is not None:
        await FastAPILimiter.init(
            redis_client, identifier=bff_client_identifier, http_callback=rate_limit_exceeded
        )
    else:
        logger.warning("Rate limiting disabled -- Redis unavailable, failing open")

    # Connect PostGIS
    db_pool = await create_pool(settings.database_url)

    # Load facility/scoring config from the DB once at startup — see
    # app/config/scoring_config_loader.py. Picking up an edit requires a restart.
    scoring_config = await load_scoring_config(FacilityConfigRepository(db_pool))
    app.state.scoring_config = scoring_config

    # Hazard config/repo -- separate from facility scoring, see
    # app/services/hazard_scoring.py for why.
    hazard_repo = HazardRepository(db_pool)
    app.state.hazard_repo = hazard_repo
    hazard_config = await load_hazard_config(hazard_repo)
    app.state.hazard_config = hazard_config
    app.state.hazard_svc = HazardScoringService(hazard_repo, hazard_config)

    # Process-wide cap on concurrent /location/analyze requests -- protects
    # the single uvicorn worker from being monopolized by a handful of large
    # concurrent requests (see app/api/concurrency.py).
    app.state.analyze_in_flight_limiter = InFlightLimiter(settings.analyze_max_in_flight)

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
    app.state.distance_svc = DistanceService(
        osrm,
        cache,
        scoring_config.facility_configs,
        max_destinations_per_leg=settings.osrm_max_destinations_per_leg,
    )
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

    settings = get_settings()

    # health stays unauthenticated -- the docker-compose healthcheck (and any
    # external uptime monitor) doesn't have the shared secret.
    app.include_router(health.router)
    app.include_router(
        search.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(settings.rate_limit_search_times, settings.rate_limit_search_seconds)
            ),
        ],
    )
    app.include_router(
        categories.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(
                    settings.rate_limit_categories_times, settings.rate_limit_categories_seconds
                )
            ),
        ],
    )
    app.include_router(
        analyze.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(settings.rate_limit_analyze_times, settings.rate_limit_analyze_seconds)
            ),
            Depends(analyze_capacity_guard),
        ],
    )
    app.include_router(
        hazard.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(
                    settings.rate_limit_hazard_cells_times, settings.rate_limit_hazard_cells_seconds
                )
            ),
        ],
    )

    return app


app = create_app()
