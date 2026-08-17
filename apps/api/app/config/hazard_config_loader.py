from pydantic import BaseModel, ConfigDict

from app.config.hazard_config import HAZARD_GRID_RESOLUTION, HazardTypeConfig
from app.repositories.db.hazard_repository import HazardRepository


class HazardScoringConfig(BaseModel):
    """Hazard type config loaded from the database once at API startup and
    cached in app.state for the process lifetime, mirroring ScoringConfig's
    role for facility_types. Picking up an edit to hazard_types requires
    restarting the API process."""

    model_config = ConfigDict(frozen=True)

    hazard_types: dict[str, HazardTypeConfig]
    resolution: int = HAZARD_GRID_RESOLUTION


async def load_hazard_config(repo: HazardRepository) -> HazardScoringConfig:
    rows = await repo.fetch_hazard_types()

    hazard_types = {
        row["slug"]: HazardTypeConfig(
            label=row["label"],
            color=row["color"],
            description=row["description"],
            default_weight=row["default_weight"],
            severe_threshold=row["severe_threshold"],
            is_proxy=row["is_proxy"],
            implemented=row["implemented"],
        )
        for row in rows
    }

    return HazardScoringConfig(hazard_types=hazard_types)
