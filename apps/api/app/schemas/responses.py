from pydantic import BaseModel


class AddressResult(BaseModel):
    displayName: str
    lat: float
    lon: float


class CategoryInfo(BaseModel):
    id: str
    label: str
    implemented: bool
    color: str


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
    distanceKm: float


class ScoreResult(BaseModel):
    education: float | None = None
    healthcare: float | None = None
    transport: float | None = None
    shopping: float | None = None
    overall: float | None = None
    coverage: str


class AnalyzeResponse(BaseModel):
    location: LocationResult
    features: list[FeatureResult]
    score: ScoreResult
    warnings: list[str]


class HealthResponse(BaseModel):
    status: str
    version: str
