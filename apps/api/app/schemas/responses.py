from typing import Literal

from pydantic import BaseModel, Field

from app.models.address import Address


class AddressSuggestion(BaseModel):
    displayName: str
    lat: float
    lon: float

    @classmethod
    def from_model(cls, address: Address) -> "AddressSuggestion":
        # Callers only pass rows the query filtered to non-null coordinates.
        return cls(
            displayName=address.full_address,
            lat=float(address.shape_y),  # type: ignore[arg-type]
            lon=float(address.shape_x),  # type: ignore[arg-type]
        )


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


class FacilityCriterionResult(BaseModel):
    label: str
    satisfied: bool | None
    detail: str


class FacilityContributionResult(BaseModel):
    facilityType: str = Field(alias="facility_type")
    weightPct: float = Field(alias="weight_pct")
    score: float | None = None

    model_config = {"populate_by_name": True}


class CategoryContributionResult(BaseModel):
    category: str
    weightPct: float = Field(alias="weight_pct")
    score: float | None = None

    model_config = {"populate_by_name": True}


class FacilityScoreResult(BaseModel):
    facilityType: str = Field(alias="facility_type")
    status: Literal["not_checked", "scored"]
    score: float | None = None
    nearestDistanceKm: float | None = Field(default=None, alias="nearest_distance_km")
    count: int
    explanation: str
    criteria: list[FacilityCriterionResult] = []
    proximityScore: float | None = Field(default=None, alias="proximity_score")
    densityScore: float | None = Field(default=None, alias="density_score")
    proximityWeight: float | None = Field(default=None, alias="proximity_weight")
    densityWeight: float | None = Field(default=None, alias="density_weight")
    leg: Literal["walk", "drive"] | None = None

    model_config = {"populate_by_name": True}


class CategoryScoreResult(BaseModel):
    category: str
    status: Literal["not_checked", "scored"]
    score: float | None = None
    facilities: list[FacilityScoreResult]
    contribution: list[FacilityContributionResult] = []


class ScoreResult(BaseModel):
    overall: float | None = None
    coverage: str
    categories: list[CategoryScoreResult]
    contribution: list[CategoryContributionResult] = []


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


class ReportJobCreated(BaseModel):
    jobId: str
    status: Literal["queued", "running", "ready", "failed"]


class ReportJobStatus(BaseModel):
    jobId: str
    status: Literal["queued", "running", "ready", "failed"]
    error: str | None = None
    expiresAt: str | None = None
    filename: str | None = None
