from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    # TODO: Move to environment variables
    database_url: str = "postgresql://gisuser:gisuser@localhost:5432/gis"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    osrm_url: str = "http://localhost:5000"
    redis_url: str = "redis://localhost:6379"
    scoring_alpha: float = 0.6
    scoring_beta: float = 0.4
    scoring_density_factor: float = 10.0
    # Shared secret checked against the X-Internal-Api-Key header (see
    # app/api/deps.py). None (the default, e.g. local dev) skips enforcement
    # entirely; set in production from the API_SHARED_SECRET GitHub secret.
    api_shared_secret: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
