"""Static scoring configuration: per-facility blends and category/composite weights.

Values are config, not code — the scoring service reads these dicts rather than
hardcoding weights inline (see refactor spec §2-§4).
"""

from typing import Literal

from pydantic import BaseModel, model_validator

DistanceMode = Literal["walk", "drive", "best_of_both"]


class FacilityConfig(BaseModel):
    distance_mode: DistanceMode
    decay_constant: float  # km, matching distance_mode's unit
    reference_radius: float  # soft reference point, NOT a hard cutoff
    hard_cutoff: float  # performance bound only, ~3x reference_radius
    saturation_point: float  # raw density count mapping to ~95/100
    proximity_weight: float  # must sum to 1 with density_weight
    density_weight: float
    count_ceiling: float | None = None
    # only present when distance_mode == "best_of_both" (railway stations)
    drive_decay_constant: float | None = None
    drive_reference_radius: float | None = None
    drive_hard_cutoff: float | None = None

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> "FacilityConfig":
        if abs(self.proximity_weight + self.density_weight - 1.0) > 1e-6:
            raise ValueError("proximity_weight + density_weight must sum to 1.0")
        return self

    @model_validator(mode="after")
    def hard_cutoff_exceeds_reference_radius(self) -> "FacilityConfig":
        drive_fields = (
            self.drive_decay_constant,
            self.drive_reference_radius,
            self.drive_hard_cutoff,
        )
        if self.distance_mode == "best_of_both" and any(f is None for f in drive_fields):
            raise ValueError(
                "drive_decay_constant, drive_reference_radius, and drive_hard_cutoff "
                "must all be set for best_of_both distance_mode"
            )
        if self.hard_cutoff <= self.reference_radius:
            raise ValueError("hard_cutoff must be strictly greater than reference_radius")
        if self.drive_hard_cutoff is not None and self.drive_reference_radius is not None:
            if self.drive_hard_cutoff <= self.drive_reference_radius:
                raise ValueError(
                    "drive_hard_cutoff must be strictly greater than drive_reference_radius"
                )
        return self


FACILITY_CONFIGS: dict[str, FacilityConfig] = {
    "schools": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.4,
        reference_radius=1.0,
        hard_cutoff=3.0,
        saturation_point=3,
        proximity_weight=0.5,
        density_weight=0.5,
    ),
    "universities": FacilityConfig(
        distance_mode="drive",
        decay_constant=5,
        reference_radius=10,
        hard_cutoff=25,
        saturation_point=1,
        proximity_weight=0.85,
        density_weight=0.15,
        count_ceiling=1,
    ),
    "libraries": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.6,
        reference_radius=1.5,
        hard_cutoff=4.0,
        saturation_point=1,
        proximity_weight=0.7,
        density_weight=0.3,
        count_ceiling=2,
    ),
    "parks": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.35,
        reference_radius=0.8,
        hard_cutoff=2.5,
        saturation_point=2,
        proximity_weight=0.6,
        density_weight=0.4,
    ),
    "bus_stops": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.2,
        reference_radius=0.45,
        hard_cutoff=1.2,
        saturation_point=3,
        proximity_weight=0.4,
        density_weight=0.6,
        # NOTE: density input must be deduplicated stop count, not raw stop count.
    ),
    "railway_stations": FacilityConfig(
        distance_mode="best_of_both",
        decay_constant=0.5,
        reference_radius=1.0,
        hard_cutoff=3.0,  # walk leg
        drive_decay_constant=3,
        drive_reference_radius=5,
        drive_hard_cutoff=15,  # drive leg
        saturation_point=2,
        proximity_weight=0.65,
        density_weight=0.35,
        count_ceiling=3,
        # compute both legs, take whichever produces the higher proximity sub-score
    ),
    "hospitals": FacilityConfig(
        distance_mode="drive",
        decay_constant=4,
        reference_radius=5,
        hard_cutoff=15,
        saturation_point=1,
        proximity_weight=0.85,
        density_weight=0.15,
        count_ceiling=2,
    ),
    "pharmacies": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.5,
        reference_radius=1.0,
        hard_cutoff=3.0,
        saturation_point=2,
        proximity_weight=0.45,
        density_weight=0.55,
    ),
    "supermarkets": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.5,
        reference_radius=1.1,
        hard_cutoff=3.0,
        saturation_point=2,
        proximity_weight=0.45,
        density_weight=0.55,
    ),
}


# Which facility types roll up into each of the five categories, and their
# relative weight within that category.
CATEGORY_FACILITY_WEIGHTS: dict[str, dict[str, float]] = {
    "education": {"schools": 0.85, "universities": 0.15},
    "recreation": {"parks": 0.55, "libraries": 0.45},
    "transport": {"bus_stops": 0.45, "railway_stations": 0.55},
    "healthcare": {"hospitals": 0.65, "pharmacies": 0.35},
    "shopping": {"supermarkets": 1.0},
}


# Composite weight per category. Shopping/Recreation split the old combined
# 10% as 7/3 — provisional pending real usage data on buyer/renter behaviour.
# Named constant per spec §4 since it's the most likely value to change post-launch.
CATEGORY_WEIGHTS: dict[str, float] = {
    "education": 0.40,
    "transport": 0.30,
    "healthcare": 0.20,
    "shopping": 0.07,
    "recreation": 0.03,
}

assert abs(sum(CATEGORY_WEIGHTS.values()) - 1.0) < 1e-9, "CATEGORY_WEIGHTS must sum to 1.0"


def fetch_radius_km(facility_type: str, requested_radius_km: float) -> float:
    """The Overpass/OSM fetch bound for one facility type.

    `hard_cutoff` is exactly what facility_score's density sum filters
    against, so the fetch radius and the scoring cutoff must be the same
    number per facility — otherwise we either truncate POIs that should
    legitimately contribute a small decayed weight, or fetch data we'll
    never use. The user's requested radius still narrows the search when
    it's smaller than the facility's cutoff.

    For best_of_both facilities, covers whichever leg (walk/drive) reaches
    further, so a station only reachable by a longer drive isn't missed.
    """
    cfg = FACILITY_CONFIGS.get(facility_type)
    if cfg is None:
        return requested_radius_km

    max_cutoff = cfg.hard_cutoff
    if cfg.drive_hard_cutoff is not None:
        max_cutoff = max(max_cutoff, cfg.drive_hard_cutoff)

    return min(requested_radius_km, max_cutoff)
