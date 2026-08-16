from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
