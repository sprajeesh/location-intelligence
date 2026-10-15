from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.validators import bound_category_weights, dedupe_categories


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
    # None = use the server's DB-configured default category weights (GET
    # /category-weights). Keys are composite category names, values are
    # fractions. Not required to sum to 1.0 here -- score() only ever uses
    # weights for categories that are actually scored, so a client sending
    # overrides only for its "active" categories is the expected shape.
    # Unknown category names are rejected in the route handler, where the
    # real DB-loaded category set is available (same split as `categories`).
    category_weights: dict[str, float] | None = Field(default=None, alias="categoryWeights")
    distance_mode: Literal["driving", "walking"] = Field(default="driving", alias="distanceMode")

    model_config = {"populate_by_name": True}

    @field_validator("categories")
    @classmethod
    def _strip_dedupe_categories(cls, value: list[str] | None) -> list[str] | None:
        return dedupe_categories(value)

    @field_validator("category_weights")
    @classmethod
    def _bound_category_weights(cls, value: dict[str, float] | None) -> dict[str, float] | None:
        return bound_category_weights(value)
