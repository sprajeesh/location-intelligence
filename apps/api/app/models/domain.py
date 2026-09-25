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
    # Allow-listed OSM tags (phone, website, opening_hours, etc.) -- see
    # app/clients/overpass.py's _DETAIL_TAGS. None when the element carried
    # none of them.
    details: dict[str, str] | None = None


@dataclass
class FacilityCriterion:
    label: str
    # None means "not checked" (unknown), distinct from False (checked, not met).
    satisfied: bool | None
    detail: str


@dataclass
class FacilityContribution:
    facility_type: str
    weight_pct: float
    score: float | None


@dataclass
class CategoryContribution:
    category: str
    weight_pct: float
    score: float | None


@dataclass
class FacilityScore:
    facility_type: str
    status: FacilityStatus
    score: float | None
    nearest_distance_km: float | None
    count: int
    explanation: str
    criteria: list[FacilityCriterion] = field(default_factory=list)


@dataclass
class CategoryScore:
    category: str
    status: FacilityStatus
    score: float | None
    facilities: list[FacilityScore] = field(default_factory=list)
    contribution: list[FacilityContribution] = field(default_factory=list)


@dataclass
class CompositeScore:
    overall: float | None
    coverage: str
    categories: list[CategoryScore] = field(default_factory=list)
    contribution: list[CategoryContribution] = field(default_factory=list)
