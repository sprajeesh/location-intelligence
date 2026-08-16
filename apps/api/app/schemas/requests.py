from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AnalyzeRequest(BaseModel):
    address: str | None = None
    lat: float | None = None
    lon: float | None = None
    # 50km, not the DB-configured hard_cutoff values (today <=25km) -- this is
    # a structural upper bound independent of scoring config, not the primary
    # defense against a huge facility/OSRM fan-out (see osrm_max_destinations_per_leg).
    radius_km: float = Field(default=10.0, alias="radiusKm", ge=0.1, le=50.0)
    # None = use the server's DB-configured default facility set; [] = explicit
    # empty selection. max_length bounds the confirmed abuse vector where an
    # unbounded categories list fans out into many real Overpass/OSRM calls;
    # today's real category set is ~12, so 50 gives headroom for growth.
    categories: list[str] | None = Field(default=None, max_length=50)
    distance_mode: Literal["driving", "walking"] = Field(default="driving", alias="distanceMode")

    model_config = {"populate_by_name": True}

    @field_validator("categories")
    @classmethod
    def _strip_dedupe_categories(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = [category.strip() for category in value if category.strip()]
        return list(dict.fromkeys(cleaned))
