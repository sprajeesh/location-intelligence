from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyze, categories, health, search
from app.clients import redis_client as redis_module
from app.clients.osrm import OSRMClient
from app.clients.overpass import OverpassClient
from app.clients.photon import PhotonClient
from app.config.settings import get_settings
from app.repositories.cache import CacheRepository
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

    # Shared HTTP client for all external services
    http_client = httpx.AsyncClient()

    # Wire up clients
    photon = PhotonClient(settings.photon_url, http_client)
    overpass = OverpassClient(settings.overpass_url, http_client)
    osrm = OSRMClient(settings.osrm_url, http_client)

    # Wire up services
    app.state.geocoding_svc = GeocodingService(photon, cache)
    app.state.facilities_svc = FacilitiesService(overpass, cache)
    app.state.distance_svc = DistanceService(osrm, cache)
    app.state.scoring_svc = LocationScoringService(
        alpha=settings.scoring_alpha,
        beta=settings.scoring_beta,
        density_factor=settings.scoring_density_factor,
    )

    yield

    # Cleanup
    await http_client.aclose()
    await redis_module.close_redis_client()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Location Intelligence API",
        version="1.0.0",
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

    app.include_router(health.router)
    app.include_router(search.router)
    app.include_router(categories.router)
    app.include_router(analyze.router)

    return app


app = create_app()
