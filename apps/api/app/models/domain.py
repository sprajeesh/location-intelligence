from dataclasses import dataclass, field


@dataclass
class Location:
    lat: float
    lon: float
    display_name: str


@dataclass
class Facility:
    id: str
    name: str
    category: str
    lat: float
    lon: float
    distance_km: float = 0.0


@dataclass
class CategoryScore:
    education: float | None = None
    healthcare: float | None = None
    transport: float | None = None
    shopping: float | None = None
    overall: float | None = None
    coverage: str = "0/0"


@dataclass
class AnalysisResult:
    location: Location
    features: list[Facility] = field(default_factory=list)
    score: CategoryScore = field(default_factory=CategoryScore)
    warnings: list[str] = field(default_factory=list)
