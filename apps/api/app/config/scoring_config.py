"""Default facility/scoring configuration: seed data for the DB migration and tests.

The running API loads its config from the database at startup (see
`app/config/scoring_config_loader.py`) — it does NOT import the dicts below. This
module exists as the single Python source for (1) the Alembic migration that seeds
the `facility_types` / `category_weights` tables, and (2) tests that need known-good
config values. Values are literal config, not code — kept here rather than inline in
a migration script so there is exactly one place to hand-author them.
"""

from typing import Literal

from pydantic import BaseModel, model_validator

DistanceMode = Literal["walk", "drive", "best_of_both"]


class FacilityConfig(BaseModel):
    # Scoring parameters
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

    # Display / category / OSM metadata (facility_types table columns)
    label: str  # plural display label, e.g. "Schools" (GET /categories, map legend)
    singular_label: str  # e.g. "school" (scoring explanation text)
    color: str  # marker color hex, e.g. "#F59E0B"
    implemented: bool
    composite_category: str  # which of the 5 composite categories this rolls into
    category_weight: float  # this facility's weight within composite_category
    is_default: bool = False  # included in the default facility set (see migration 0002)
    osm_tags: list[tuple[str, str]]  # Overpass (key, value) tag pairs

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
        label="Schools",
        singular_label="school",
        color="#F59E0B",
        implemented=True,
        composite_category="education",
        category_weight=0.55,
        is_default=True,
        osm_tags=[("amenity", "school")],
    ),
    "kindergartens": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.4,
        reference_radius=1.0,
        hard_cutoff=3.0,
        saturation_point=2,
        proximity_weight=0.6,
        density_weight=0.4,
        count_ceiling=2,
        label="Kindergartens",
        singular_label="kindergarten",
        color="#FB923C",
        implemented=True,
        composite_category="education",
        category_weight=0.20,
        osm_tags=[("amenity", "kindergarten")],
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
        label="Universities",
        singular_label="university",
        color="#8B5CF6",
        implemented=True,
        composite_category="education",
        category_weight=0.25,
        osm_tags=[("amenity", "university")],
    ),
    "libraries": FacilityConfig(
        distance_mode="drive",
        decay_constant=2,
        reference_radius=4,
        hard_cutoff=12,
        saturation_point=1,
        proximity_weight=0.7,
        density_weight=0.3,
        count_ceiling=2,
        label="Libraries",
        singular_label="library",
        color="#3B82F6",
        implemented=True,
        composite_category="recreation",
        category_weight=0.40,
        osm_tags=[("amenity", "library")],
    ),
    "parks": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.35,
        reference_radius=0.8,
        hard_cutoff=2.5,
        saturation_point=2,
        proximity_weight=0.6,
        density_weight=0.4,
        label="Parks",
        singular_label="park",
        color="#22C55E",
        implemented=True,
        composite_category="recreation",
        category_weight=0.40,
        osm_tags=[("leisure", "park")],
    ),
    "playgrounds": FacilityConfig(
        distance_mode="walk",
        decay_constant=0.25,
        reference_radius=0.5,
        hard_cutoff=1.5,
        saturation_point=2,
        proximity_weight=0.55,
        density_weight=0.45,
        label="Playgrounds",
        singular_label="playground",
        color="#A3E635",
        implemented=True,
        composite_category="recreation",
        category_weight=0.20,
        osm_tags=[("leisure", "playground")],
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
        label="Bus Stops",
        singular_label="bus stop",
        color="#14B8A6",
        implemented=True,
        composite_category="transport",
        category_weight=0.45,
        is_default=True,
        osm_tags=[("highway", "bus_stop"), ("public_transport", "platform")],
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
        label="Railway Stations",
        singular_label="railway station",
        color="#0EA5E9",
        implemented=True,
        composite_category="transport",
        category_weight=0.55,
        is_default=True,
        osm_tags=[("railway", "station")],
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
        # tag coverage: amenity=hospital + healthcare=hospital
        label="Hospitals",
        singular_label="hospital",
        color="#EF4444",
        implemented=True,
        composite_category="healthcare",
        category_weight=0.35,
        osm_tags=[("amenity", "hospital"), ("healthcare", "hospital")],
    ),
    "gps": FacilityConfig(
        distance_mode="drive",
        decay_constant=2,
        reference_radius=2.5,
        hard_cutoff=9,
        saturation_point=2,
        proximity_weight=0.6,
        density_weight=0.4,
        count_ceiling=2,
        # tag coverage: amenity=doctors/clinic + healthcare=doctor/clinic
        label="GPs",
        singular_label="GP",
        color="#F97316",
        implemented=True,
        composite_category="healthcare",
        category_weight=0.45,
        is_default=True,
        osm_tags=[
            ("amenity", "doctors"),
            ("amenity", "clinic"),
            ("healthcare", "doctor"),
            ("healthcare", "clinic"),
        ],
    ),
    "pharmacies": FacilityConfig(
        distance_mode="drive",
        decay_constant=1.5,
        reference_radius=2,
        hard_cutoff=8,
        saturation_point=2,
        proximity_weight=0.65,
        density_weight=0.35,
        count_ceiling=2,
        label="Pharmacies",
        singular_label="pharmacy",
        color="#EC4899",
        implemented=True,
        composite_category="healthcare",
        category_weight=0.20,
        osm_tags=[("amenity", "pharmacy")],
    ),
    "supermarkets": FacilityConfig(
        distance_mode="drive",
        decay_constant=2,
        reference_radius=3,
        hard_cutoff=10,
        saturation_point=2,
        proximity_weight=0.6,
        density_weight=0.4,
        count_ceiling=3,
        label="Supermarkets",
        singular_label="supermarket",
        color="#10B981",
        implemented=True,
        composite_category="shopping",
        category_weight=1.0,
        is_default=True,
        osm_tags=[("shop", "supermarket")],
    ),
}


def build_category_facility_weights(
    configs: dict[str, FacilityConfig],
) -> dict[str, dict[str, float]]:
    """Derive the category -> {facility_type: weight} rollup from each facility's
    own composite_category/category_weight fields, so this isn't hand-duplicated.

    Also used by the DB-backed loader (scoring_config_loader.py) to build the same
    shape from rows fetched at runtime.
    """
    result: dict[str, dict[str, float]] = {}
    for facility_type, cfg in configs.items():
        result.setdefault(cfg.composite_category, {})[facility_type] = cfg.category_weight
    return result


# Which facility types roll up into each of the five categories, and their
# relative weight within that category.
CATEGORY_FACILITY_WEIGHTS: dict[str, dict[str, float]] = build_category_facility_weights(
    FACILITY_CONFIGS
)


# Composite weight per category. Recreation defaults to 0% by design (none of
# its facility types are in the default facility set); the other four are
# rescaled from their original 0.40/0.30/0.20/0.07 (summing to 0.97) up to 1.0,
# preserving their relative ratios. See migration 0004. Users can still
# override these per-request via AnalyzeRequest.category_weights once
# Recreation is activated in Settings. Named constant per spec §4 since it's
# the most likely value to change post-launch.
CATEGORY_WEIGHTS: dict[str, float] = {
    "education": 0.4124,
    "transport": 0.3093,
    "healthcare": 0.2062,
    "shopping": 0.0721,
    "recreation": 0.0000,
}

assert abs(sum(CATEGORY_WEIGHTS.values()) - 1.0) < 1e-9, "CATEGORY_WEIGHTS must sum to 1.0"


def fetch_radius_km(
    facility_configs: dict[str, FacilityConfig], facility_type: str, requested_radius_km: float
) -> float:
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
    cfg = facility_configs.get(facility_type)
    if cfg is None:
        return requested_radius_km

    max_cutoff = cfg.hard_cutoff
    if cfg.drive_hard_cutoff is not None:
        max_cutoff = max(max_cutoff, cfg.drive_hard_cutoff)

    return min(requested_radius_km, max_cutoff)
