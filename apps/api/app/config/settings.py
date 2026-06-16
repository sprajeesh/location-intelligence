from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    photon_url: str = "http://localhost:2322"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    osrm_url: str = "http://localhost:5000"
    redis_url: str = "redis://localhost:6379"
    scoring_alpha: float = 0.6
    scoring_beta: float = 0.4
    scoring_density_factor: float = 10.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
