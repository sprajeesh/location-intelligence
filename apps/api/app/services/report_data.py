"""Report data model: everything the PDF needs, derived from an analyze result.

Pure functions only -- no I/O, no HTTP, no auth/session state.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.config.scoring_config_loader import ScoringConfig
from app.schemas.responses import (
    AnalyzeResponse,
    CategoryScoreResult,
    FacilityScoreResult,
    FeatureResult,
)
from app.services.report_hints import LOW_SCORE_THRESHOLD, build_hint


@dataclass
class FacilityBreakup:
    facility_type: str
    label: str
    status: str  # "scored" | "not_checked"
    score: float | None
    nearest_km: float | None
    count: int
    leg: str | None
    explanation: str
    proximity_score: float | None = None
    density_score: float | None = None
    proximity_weight: float | None = None
    density_weight: float | None = None
    # Points each factor adds to `score` (score * weight); sum ~= score.
    proximity_contribution: float | None = None
    density_contribution: float | None = None
    decay_km: float | None = None
    hard_cutoff_km: float | None = None
    weight_in_category_pct: float = 0.0
    hint: str | None = None


@dataclass
class CategoryBreakup:
    category: str
    label: str
    status: str
    score: float | None
    weight_in_overall_pct: float
    facilities: list[FacilityBreakup] = field(default_factory=list)


@dataclass
class ReportFeature:
    id: str
    name: str
    category: str
    label: str
    color: str
    lat: float
    lon: float
    distance_km: float | None


@dataclass
class ReportData:
    address: str
    lat: float
    lon: float
    radius_km: float
    distance_mode: str
    generated_at: datetime
    app_version: str
    overall: float | None
    coverage: str
    categories: list[CategoryBreakup]
    features: list[ReportFeature]
    warnings: list[str]
    low_score_threshold: float = LOW_SCORE_THRESHOLD

    @property
    def facilities(self) -> list[FacilityBreakup]:
        return [f for c in self.categories for f in c.facilities]

    @property
    def strengths(self) -> list[FacilityBreakup]:
        scored = [f for f in self.facilities if f.score is not None]
        return sorted(
            (f for f in scored if (f.score or 0) >= self.low_score_threshold),
            key=lambda f: -(f.score or 0),
        )[:3]

    @property
    def gaps(self) -> list[FacilityBreakup]:
        scored = [f for f in self.facilities if f.score is not None]
        return sorted(
            (f for f in scored if (f.score or 0) < self.low_score_threshold),
            key=lambda f: f.score or 0,
        )[:3]


def _facility_breakup(
    result: FacilityScoreResult,
    config: ScoringConfig,
    weight_pct: float,
) -> FacilityBreakup:
    cfg = config.facility_configs[result.facilityType]
    breakup = FacilityBreakup(
        facility_type=result.facilityType,
        label=cfg.label,
        status=result.status,
        score=result.score,
        nearest_km=result.nearestDistanceKm,
        count=result.count,
        leg=result.leg,
        explanation=result.explanation,
        weight_in_category_pct=weight_pct,
    )
    if result.status != "scored":
        return breakup

    breakup.proximity_score = result.proximityScore
    breakup.density_score = result.densityScore
    breakup.proximity_weight = result.proximityWeight
    breakup.density_weight = result.densityWeight
    if result.proximityScore is not None and result.proximityWeight is not None:
        breakup.proximity_contribution = round(result.proximityScore * result.proximityWeight, 1)
    if result.densityScore is not None and result.densityWeight is not None:
        breakup.density_contribution = round(result.densityScore * result.densityWeight, 1)
    if result.leg == "drive" and cfg.drive_decay_constant is not None:
        breakup.decay_km, breakup.hard_cutoff_km = cfg.drive_decay_constant, cfg.drive_hard_cutoff
    else:
        breakup.decay_km, breakup.hard_cutoff_km = cfg.decay_constant, cfg.hard_cutoff

    hint = build_hint(result, cfg)
    breakup.hint = hint.text if hint else None
    return breakup


def _category_breakup(
    cat: CategoryScoreResult, config: ScoringConfig, overall_weights: dict[str, float]
) -> CategoryBreakup:
    member_weights = {c.facilityType: c.weightPct for c in cat.contribution}
    return CategoryBreakup(
        category=cat.category,
        label=cat.category.replace("_", " ").title(),
        status=cat.status,
        score=cat.score,
        weight_in_overall_pct=overall_weights.get(cat.category, 0.0),
        facilities=[
            _facility_breakup(f, config, member_weights.get(f.facilityType, 0.0))
            for f in cat.facilities
        ],
    )


def build_report_data(
    analysis: AnalyzeResponse,
    config: ScoringConfig,
    *,
    radius_km: float,
    distance_mode: str,
    app_version: str,
    generated_at: datetime | None = None,
) -> ReportData:
    overall_weights = {c.category: c.weightPct for c in analysis.score.contribution}
    category_meta = {c.id: c for c in config.categories}

    def to_feature(f: FeatureResult) -> ReportFeature:
        meta = category_meta.get(f.category)
        return ReportFeature(
            id=f.id,
            name=f.name,
            category=f.category,
            label=meta.label if meta else f.category,
            color=meta.color if meta else "#64748B",
            lat=f.lat,
            lon=f.lon,
            distance_km=f.distanceKm,
        )

    return ReportData(
        address=analysis.location.displayName,
        lat=analysis.location.lat,
        lon=analysis.location.lon,
        radius_km=radius_km,
        distance_mode=distance_mode,
        generated_at=generated_at or datetime.now(UTC),
        app_version=app_version,
        overall=analysis.score.overall,
        coverage=analysis.score.coverage,
        categories=[
            _category_breakup(c, config, overall_weights) for c in analysis.score.categories
        ],
        features=sorted(
            (to_feature(f) for f in analysis.features),
            key=lambda f: (f.category, f.distance_km is None, f.distance_km or 0.0),
        ),
        warnings=list(analysis.warnings),
    )
