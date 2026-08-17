from dataclasses import dataclass, field
from datetime import date
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


@dataclass
class HazardSubScore:
    hazard_type: str
    score: float
    severe: bool
    is_proxy: bool
    source_name: str
    licence: str
    data_currency_date: date


@dataclass
class HazardScore:
    """A point's hazard result, deliberately separate from CompositeScore --
    hazard exposure is never blended into the facility overall score (see
    HAZARD.md's "averaging hides a single catastrophic risk" warning)."""

    h3_index: str
    resolution: int
    composite_score: float
    worst_hazard_type: str
    worst_hazard_score: float
    any_severe: bool
    hazards: list[HazardSubScore] = field(default_factory=list)
