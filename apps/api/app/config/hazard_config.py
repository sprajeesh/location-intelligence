"""Hazard type configuration: seed data for the DB migration and tests.

Mirrors app/config/scoring_config.py's role for facility_types: the running
API loads hazard config from the database at startup (see
app/config/hazard_config_loader.py) — it does NOT import HAZARD_TYPE_CONFIGS
directly. This module is the single Python source for (1) the Alembic
migration that seeds the `hazard_types` table, and (2) tests needing known
config values.

Phase-0 scaffold: "demo_hazard" is fabricated. "coastal_elevation_proxy" is
the first real (Phase-1) hazard, seeded by migration 0004 and populated by
pipelines/hazard/coastal_elevation_proxy.py. Remaining real hazard types
(faults, seismic, volcanic, landslide, real tsunami/flood) each get their
own later migration once ingestible — see apps/api/docs/HAZARD_SOURCES.md
for which sources are actually ingestible today.
"""

from pydantic import BaseModel, Field

# H3 resolution for the national hazard grid (~5 km^2 cells at res 7, per
# HAZARD.md's suggested "national view" resolution). Shared by the ingestion
# pipeline and the scoring service so they can never disagree on cell size.
HAZARD_GRID_RESOLUTION = 7

HAZARD_DISCLAIMER = (
    "Illustrative hazard estimate at grid-cell resolution, built from "
    "available data. Not a Land Information Memorandum, not "
    "property-specific advice, and not a prediction of events."
)


class HazardTypeConfig(BaseModel):
    label: str
    color: str
    description: str
    default_weight: float  # composite weighting; user-adjustable in a later stage
    severe_threshold: float = Field(ge=0, le=100)  # sub-score >= this => severe flag
    is_proxy: bool  # true when this hazard is a derived proxy, not authoritative data
    implemented: bool = True


HAZARD_TYPE_CONFIGS: dict[str, HazardTypeConfig] = {
    "demo_hazard": HazardTypeConfig(
        label="Demo Hazard",
        color="#b2182b",
        description=(
            "Phase-0 scaffold placeholder hazard, generated deterministically "
            "over a fixed Auckland demo area to prove the pipeline end to end. "
            "Not a real hazard assessment."
        ),
        default_weight=1.0,
        severe_threshold=80.0,
        is_proxy=True,
        implemented=True,
    ),
    "coastal_elevation_proxy": HazardTypeConfig(
        label="Coastal & Tsunami Exposure (proxy)",
        color="#2166ac",
        description=(
            "Illustrative proxy combining ground elevation and distance to "
            "the coastline: low-lying land close to the sea scores higher. "
            "Stands in for a real national tsunami hazard model, which does "
            "not currently exist as a public bulk dataset (see "
            "apps/api/docs/HAZARD_SOURCES.md). Not a tsunami inundation "
            "prediction."
        ),
        default_weight=1.0,
        severe_threshold=70.0,
        is_proxy=True,
        implemented=True,
    ),
}
