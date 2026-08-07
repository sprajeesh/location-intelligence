from pydantic import BaseModel, ConfigDict

from app.config.scoring_config import (
    FacilityConfig,
    build_category_facility_weights,
)
from app.config.scoring_config import (
    fetch_radius_km as _fetch_radius_km,
)
from app.repositories.db.facility_config_repository import FacilityConfigRepository
from app.schemas.responses import CategoryInfo


class ScoringConfig(BaseModel):
    """Facility/scoring config loaded from the database once at API startup and
    cached in app.state for the process lifetime. Picking up an edit made to the
    facility_types/category_weights tables requires restarting the API process."""

    model_config = ConfigDict(frozen=True)

    facility_configs: dict[str, FacilityConfig]
    category_facility_weights: dict[str, dict[str, float]]
    category_weights: dict[str, float]
    categories: list[CategoryInfo]
    category_tags: dict[str, list[tuple[str, str]]]
    default_categories: list[str]

    def fetch_radius_km(self, facility_type: str, requested_radius_km: float) -> float:
        return _fetch_radius_km(self.facility_configs, facility_type, requested_radius_km)


async def load_scoring_config(repo: FacilityConfigRepository) -> ScoringConfig:
    """Build a ScoringConfig from the facility_types/category_weights tables.

    Reconstructs the same dict/list shapes the scoring/distance/facilities
    services and the /categories endpoint already expect, so those consumers
    don't need to know their config now comes from the database.
    """
    facility_rows = await repo.fetch_facility_types()

    facility_configs: dict[str, FacilityConfig] = {}
    categories: list[CategoryInfo] = []
    category_tags: dict[str, list[tuple[str, str]]] = {}
    default_categories: list[str] = []

    for row in facility_rows:
        slug = row["slug"]
        cfg = FacilityConfig(
            distance_mode=row["distance_mode"],
            decay_constant=row["decay_constant"],
            reference_radius=row["reference_radius"],
            hard_cutoff=row["hard_cutoff"],
            saturation_point=row["saturation_point"],
            proximity_weight=row["proximity_weight"],
            density_weight=row["density_weight"],
            count_ceiling=row["count_ceiling"],
            drive_decay_constant=row["drive_decay_constant"],
            drive_reference_radius=row["drive_reference_radius"],
            drive_hard_cutoff=row["drive_hard_cutoff"],
            label=row["label"],
            singular_label=row["singular_label"],
            color=row["color"],
            implemented=row["implemented"],
            composite_category=row["composite_category"],
            category_weight=row["category_weight"],
            is_default=row["is_default"],
            osm_tags=row["osm_tags"],
        )
        facility_configs[slug] = cfg
        categories.append(
            CategoryInfo(
                id=slug,
                label=cfg.label,
                implemented=cfg.implemented,
                color=cfg.color,
                is_default=cfg.is_default,
                composite_category=cfg.composite_category,
            )
        )
        category_tags[slug] = cfg.osm_tags
        if cfg.is_default:
            default_categories.append(slug)

    category_facility_weights = build_category_facility_weights(facility_configs)

    category_weight_rows = await repo.fetch_category_weights()
    category_weights = {row["category"]: row["weight"] for row in category_weight_rows}

    total = sum(category_weights.values())
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"category_weights must sum to 1.0, got {total}")

    return ScoringConfig(
        facility_configs=facility_configs,
        category_facility_weights=category_facility_weights,
        category_weights=category_weights,
        categories=categories,
        category_tags=category_tags,
        default_categories=default_categories,
    )
