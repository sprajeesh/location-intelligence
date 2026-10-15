import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi_limiter import FastAPILimiter

from app.api import (
    analyze,
    categories,
    client_errors,
    contact,
    health,
    map_corrections,
    parcels,
    reports,
    route,
    search,
)
from app.api.concurrency import InFlightLimiter, analyze_capacity_guard
from app.api.deps import verify_api_key
from app.api.rate_limit import bff_client_identifier, rate_limit_exceeded, rate_limiter
from app.api.validation_errors import validation_error_detail
from app.clients import redis_client as redis_module
from app.clients.circuit_breaker import CircuitBreaker
from app.clients.linz import LinzClient
from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.clients.wikidata import WikidataClient
from app.config.scoring_config_loader import load_scoring_config
from app.config.settings import get_settings
from app.config.version import get_version
from app.logging_config import configure_logging
from app.middleware.request_context import RequestContextMiddleware
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.repositories.db.connection import (
    create_engine,
    create_session_factory,
    dispose_engine,
)
from app.repositories.db.facility_config_repository import FacilityConfigRepository
from app.repositories.db.map_correction_repository import MapCorrectionRepository
from app.repositories.report_jobs import ReportJobStore
from app.services.distance import DistanceService
from app.services.facilities import FacilitiesService
from app.services.geocoding import GeocodingService
from app.services.map_corrections import MapCorrectionService
from app.services.routing import RoutingService
from app.services.scoring import LocationScoringService
from app.services.wikidata_enrichment import WikidataEnrichmentService

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
        logger.warning(
            "Rate limiting disabled -- Redis unavailable, failing open",
            extra={"event": "rate_limit.disabled"},
        )

    # Connect PostGIS -- one engine/pool shared by every repository.
    db_engine = create_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_pool_max_overflow,
        pool_recycle_seconds=settings.db_pool_recycle_seconds,
        statement_timeout_ms=settings.db_statement_timeout_ms,
    )
    session_factory = create_session_factory(db_engine)

    # Load facility/scoring config from the DB once at startup — see
    # app/config/scoring_config_loader.py. Picking up an edit requires a restart.
    scoring_config = await load_scoring_config(FacilityConfigRepository(session_factory))
    app.state.scoring_config = scoring_config

    # Process-wide cap on concurrent /location/analyze requests -- protects
    # the single uvicorn worker from being monopolized by a handful of large
    # concurrent requests (see app/api/concurrency.py).
    app.state.analyze_in_flight_limiter = InFlightLimiter(settings.analyze_max_in_flight)

    # Report jobs (app/api/reports.py): status + PDF live in Redis; rendering is
    # CPU-bound so concurrency is capped tighter than analyze.
    app.state.report_store = ReportJobStore(redis_client, settings.report_ttl_seconds)
    app.state.report_in_flight_limiter = InFlightLimiter(settings.report_max_in_flight)

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
    # Separate breakers per mode so a walking/cycling OSRM outage doesn't
    # trip the breaker shared by driving routes and facility-distance scoring.
    osrm_foot_breaker = CircuitBreaker(
        "osrm-foot",
        failure_threshold=settings.osrm_breaker_failure_threshold,
        cooldown_seconds=settings.osrm_breaker_cooldown_seconds,
    )
    osrm_bike_breaker = CircuitBreaker(
        "osrm-bike",
        failure_threshold=settings.osrm_breaker_failure_threshold,
        cooldown_seconds=settings.osrm_breaker_cooldown_seconds,
    )
    linz_breaker = CircuitBreaker(
        "linz",
        failure_threshold=settings.linz_breaker_failure_threshold,
        cooldown_seconds=settings.linz_breaker_cooldown_seconds,
    )
    wikidata_breaker = CircuitBreaker(
        "wikidata",
        failure_threshold=settings.wikidata_breaker_failure_threshold,
        cooldown_seconds=settings.wikidata_breaker_cooldown_seconds,
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
    osrm_foot = OSRMClient(
        settings.osrm_foot_url,
        http_client,
        max_concurrency=settings.osrm_max_concurrency,
        breaker=osrm_foot_breaker,
    )
    osrm_bike = OSRMClient(
        settings.osrm_bike_url,
        http_client,
        max_concurrency=settings.osrm_max_concurrency,
        breaker=osrm_bike_breaker,
    )
    linz_client = LinzClient(
        settings.linz_api_key,
        http_client,
        max_concurrency=settings.linz_max_concurrency,
        breaker=linz_breaker,
    )
    app.state.linz_client = linz_client
    wikidata_client = WikidataClient(
        settings.wikidata_url,
        http_client,
        max_concurrency=settings.wikidata_max_concurrency,
        breaker=wikidata_breaker,
    )

    # Wire up services
    app.state.geocoding_svc = GeocodingService(AddressRepository(session_factory), cache)
    app.state.facilities_svc = FacilitiesService(overpass, cache, scoring_config)
    app.state.distance_svc = DistanceService(
        osrm,
        cache,
        scoring_config.facility_configs,
        max_destinations_per_leg=settings.osrm_max_destinations_per_leg,
    )
    app.state.routing_svc = RoutingService(
        {"driving": osrm, "walking": osrm_foot, "cycling": osrm_bike}
    )
    app.state.scoring_svc = LocationScoringService(
        scoring_config.facility_configs,
        scoring_config.category_facility_weights,
        scoring_config.category_weights,
    )
    app.state.wikidata_enrichment_svc = WikidataEnrichmentService(wikidata_client, cache)
    app.state.map_correction_svc = MapCorrectionService(
        MapCorrectionRepository(session_factory), overpass, scoring_config, settings
    )

    yield

    # Cleanup
    await dispose_engine(db_engine)
    await http_client.aclose()
    await redis_module.close_redis_client()


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

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
    # Added last so it wraps CORS: every response, including CORS-rejected ones,
    # gets an X-Request-ID and an access log line.
    app.add_middleware(RequestContextMiddleware)

    @app.exception_handler(RequestValidationError)
    async def _validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = validation_error_detail(exc.errors())
        if request.url.path == "/map-corrections":
            # Field names only: the values submitted are never logged.
            logger.info(
                "Map correction rejected",
                extra={
                    "event": "map_correction.rejected",
                    "error_loc": [".".join(str(part) for part in e["loc"]) for e in errors],
                },
            )
        return JSONResponse(status_code=422, content={"detail": errors})

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
        route.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(settings.rate_limit_route_times, settings.rate_limit_route_seconds)
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
        contact.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(settings.rate_limit_contact_times, settings.rate_limit_contact_seconds)
            ),
        ],
    )
    app.include_router(map_corrections.router, dependencies=[Depends(verify_api_key)])
    app.include_router(
        client_errors.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(
                    settings.rate_limit_client_errors_times,
                    settings.rate_limit_client_errors_seconds,
                )
            ),
        ],
    )
    app.include_router(reports.router, dependencies=[Depends(verify_api_key)])
    app.include_router(
        parcels.router,
        dependencies=[
            Depends(verify_api_key),
            Depends(
                rate_limiter(settings.rate_limit_parcels_times, settings.rate_limit_parcels_seconds)
            ),
        ],
    )

    return app


app = create_app()
