from typing import Literal

from pydantic import BaseModel, Field


class AddressResult(BaseModel):
    displayName: str
    lat: float
    lon: float


class CategoryInfo(BaseModel):
    id: str
    label: str
    implemented: bool
    color: str
    isDefault: bool = Field(default=False, validation_alias="is_default")
    compositeCategory: str = Field(validation_alias="composite_category")

    model_config = {"populate_by_name": True}


class LocationResult(BaseModel):
    lat: float
    lon: float
    displayName: str


class FeatureResult(BaseModel):
    id: str
    name: str
    category: str
    lat: float
    lon: float
    distanceKm: float | None = None
    details: dict[str, str] | None = None


class FacilityScoreResult(BaseModel):
    facilityType: str = Field(alias="facility_type")
    status: Literal["not_checked", "scored"]
    score: float | None = None
    nearestDistanceKm: float | None = Field(default=None, alias="nearest_distance_km")
    count: int
    explanation: str

    model_config = {"populate_by_name": True}


class CategoryScoreResult(BaseModel):
    category: str
    status: Literal["not_checked", "scored"]
    score: float | None = None
    facilities: list[FacilityScoreResult]


class ScoreResult(BaseModel):
    overall: float | None = None
    coverage: str
    categories: list[CategoryScoreResult]


class AnalyzeResponse(BaseModel):
    location: LocationResult
    features: list[FeatureResult]
    score: ScoreResult
    warnings: list[str]


class RouteStep(BaseModel):
    instruction: str
    name: str
    distanceM: float = Field(alias="distance_m")
    durationS: float = Field(alias="duration_s")

    model_config = {"populate_by_name": True}


class RouteOption(BaseModel):
    coordinates: list[list[float]]
    distanceM: float = Field(alias="distance_m")
    durationS: float = Field(alias="duration_s")
    summary: str
    steps: list[RouteStep]

    model_config = {"populate_by_name": True}


class RouteResponse(BaseModel):
    routes: list[RouteOption]
    fallback: bool = False


class HealthResponse(BaseModel):
    status: str
    version: str
