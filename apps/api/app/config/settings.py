from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Set to "production" only by scripts/fetch-secrets.sh's generated .env
    # (the real VM deploy) -- gates the api_shared_secret check below. Local
    # dev never sets this, so it stays "development" and the secret can stay
    # unset there.
    environment: Literal["development", "production"] = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    # TODO: Move to environment variables
    database_url: str = "postgresql://gisuser:gisuser@localhost:5432/gis"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    overpass_max_concurrency: int = 2
    osrm_url: str = "http://localhost:5000"
    osrm_max_concurrency: int = 4
    # Per-facility-type, per-leg cap on how many destinations get a real OSRM
    # table call; excess destinations are dropped with a warning rather than
    # sent to OSRM uncapped (see app/services/distance.py).
    osrm_max_destinations_per_leg: int = 200
    redis_url: str = "redis://localhost:6379"
    # Shared secret checked against the X-Internal-Api-Key header (see
    # app/api/deps.py). None (the default, e.g. local dev) skips enforcement
    # entirely; set in production from the API_SHARED_SECRET GitHub secret.
    api_shared_secret: str | None = None

    # Circuit breakers (app/clients/circuit_breaker.py) -- open after this
    # many consecutive failures against the dependency, skip the network call
    # entirely for the cooldown, then allow one trial call through.
    overpass_breaker_failure_threshold: int = 5
    overpass_breaker_cooldown_seconds: float = 30.0
    osrm_breaker_failure_threshold: int = 5
    osrm_breaker_cooldown_seconds: float = 30.0

    # Process-wide cap on concurrent /location/analyze requests in flight --
    # protects the single uvicorn worker from being monopolized by a handful
    # of large concurrent requests. Requests over the cap get a fast 503
    # rather than queuing (see app/api/concurrency.py).
    analyze_max_in_flight: int = 8

    # Rate limits (app/api/rate_limit.py), keyed per caller identity via the
    # BFF-forwarded X-Forwarded-Client-Ip header. /location/analyze is the
    # expensive endpoint (Overpass + OSRM fan-out) so it gets the strictest
    # default; /search and /categories are cheap DB/Redis/in-memory lookups.
    rate_limit_analyze_times: int = 10
    rate_limit_analyze_seconds: int = 60
    rate_limit_search_times: int = 30
    rate_limit_search_seconds: int = 60
    rate_limit_categories_times: int = 60
    rate_limit_categories_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> "Settings":
        if self.environment == "production" and not self.api_shared_secret:
            raise ValueError(
                "api_shared_secret must be set when environment=production -- "
                "verify_api_key (app/api/deps.py) skips enforcement entirely "
                "when it's unset, which would leave every route open to the "
                "public internet."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
