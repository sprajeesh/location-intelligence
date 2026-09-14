from dataclasses import dataclass, field
from typing import Literal

FacilityStatus = Literal["not_checked", "scored"]


@dataclass
class Location:
    lat: float
    lon: float
    display_name: str


@dataclass
class Facility:
    id: str
    name: str
    category: str  # facility type key, e.g. "schools" — matches FACILITY_CONFIGS
    lat: float
    lon: float
    # Populated by DistanceService. `distance_km` is used for walk/drive facilities;
    # walk_distance_km/drive_distance_km are used for best_of_both facilities.
    distance_km: float | None = None
    walk_distance_km: float | None = None
    drive_distance_km: float | None = None


@dataclass
class FacilityScore:
    facility_type: str
    status: FacilityStatus
    score: float | None
    nearest_distance_km: float | None
    count: int
    explanation: str


@dataclass
class CategoryScore:
    category: str
    status: FacilityStatus
    score: float | None
    facilities: list[FacilityScore] = field(default_factory=list)


@dataclass
class CompositeScore:
    overall: float | None
    coverage: str
    categories: list[CategoryScore] = field(default_factory=list)
