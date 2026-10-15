from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.validators import (
    bound_category_weights,
    check_map_correction_type_rules,
    clean_email,
    clean_osm_id,
    clean_single_line_text,
    dedupe_categories,
    require_finite,
    strip_string,
)


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


class MapCorrectionRequest(BaseModel):
    """POST /map-corrections body: an `add` or a `remove` submission.

    Holds the structural rules. Checks that need the loaded config or the NZ
    bounding box (the facility slug set, the bounds) run in the service, which
    raises a 422 with the same error shape. The honeypot `website` field is
    accepted here so the service can answer bots with a normal-looking 202.
    """

    correction_type: Literal["add", "remove"] = Field(alias="correctionType")
    facility_type: str = Field(alias="facilityType", min_length=1, max_length=64)
    lat: float
    lon: float
    target_osm_id: str | None = Field(default=None, alias="targetOsmId")
    reason: Literal["closed", "not_found", "other"] | None = None
    name: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    reporter_email: str | None = Field(default=None, alias="reporterEmail", max_length=254)
    website: str | None = None

    model_config = {"populate_by_name": True}

    @field_validator("facility_type", mode="before")
    @classmethod
    def _strip_facility_type(cls, value: object) -> object:
        return strip_string(value)

    @field_validator("lat", "lon")
    @classmethod
    def _finite(cls, value: float) -> float:
        return require_finite(value)

    @field_validator("target_osm_id", mode="before")
    @classmethod
    def _osm_id_format(cls, value: object) -> object:
        return clean_osm_id(value)

    @field_validator("name", "address", mode="before")
    @classmethod
    def _clean_text(cls, value: object) -> object:
        return clean_single_line_text(value)

    @field_validator("reporter_email", mode="before")
    @classmethod
    def _clean_email(cls, value: object) -> object:
        return clean_email(value)

    @model_validator(mode="after")
    def _per_type_rules(self) -> "MapCorrectionRequest":
        check_map_correction_type_rules(
            self.correction_type,
            target_osm_id=self.target_osm_id,
            reason=self.reason,
            name=self.name,
            address=self.address,
        )
        return self
