"""Report data model + low-score hint tests."""

import pytest

from app.config.scoring_config import FACILITY_CONFIGS
from app.schemas.responses import (
    AnalyzeResponse,
    FacilityScoreResult,
    LocationResult,
    ScoreResult,
)
from app.services.report_data import build_report_data
from app.services.report_hints import LOW_SCORE_THRESHOLD, build_hint
from app.services.scoring import LocationScoringService
from tests.conftest import build_test_scoring_config
from tests.test_scoring import make_facility


def _analysis(facilities, categories) -> AnalyzeResponse:
    config = build_test_scoring_config()
    svc = LocationScoringService(
        config.facility_configs, config.category_facility_weights, config.category_weights
    )
    from app.api.analyze import _effective_distance_km  # noqa: F401  (shape reference)

    domain = svc.score(facilities, categories)
    # Round-trip through the same assembly the route uses.
    from app.schemas.responses import (
        CategoryContributionResult,
        CategoryScoreResult,
        FacilityContributionResult,
        FeatureResult,
    )

    score = ScoreResult(
        overall=domain.overall,
        coverage=domain.coverage,
        categories=[
            CategoryScoreResult(
                category=c.category,
                status=c.status,
                score=c.score,
                facilities=[
                    FacilityScoreResult(
                        facility_type=f.facility_type,
                        status=f.status,
                        score=f.score,
                        nearest_distance_km=f.nearest_distance_km,
                        count=f.count,
                        explanation=f.explanation,
                        proximity_score=f.proximity_score,
                        density_score=f.density_score,
                        proximity_weight=f.proximity_weight,
                        density_weight=f.density_weight,
                        leg=f.leg,
                    )
                    for f in c.facilities
                ],
                contribution=[
                    FacilityContributionResult(
                        facility_type=x.facility_type, weight_pct=x.weight_pct, score=x.score
                    )
                    for x in c.contribution
                ],
            )
            for c in domain.categories
        ],
        contribution=[
            CategoryContributionResult(category=x.category, weight_pct=x.weight_pct, score=x.score)
            for x in domain.contribution
        ],
    )
    return AnalyzeResponse(
        location=LocationResult(lat=-36.85, lon=174.76, displayName="1 Queen St, Auckland"),
        features=[
            FeatureResult(
                id=f.id,
                name=f.name,
                category=f.category,
                lat=f.lat,
                lon=f.lon,
                distanceKm=f.distance_km,
            )
            for f in facilities
        ],
        score=score,
        warnings=[],
    )


def _report(facilities, categories):
    return build_report_data(
        _analysis(facilities, categories),
        build_test_scoring_config(),
        radius_km=10,
        distance_mode="driving",
        app_version="test",
    )


def test_contributions_sum_to_facility_score():
    data = _report([make_facility("schools", 0.4), make_facility("schools", 0.9)], ["schools"])
    school = next(f for f in data.facilities if f.facility_type == "schools")
    total = school.proximity_contribution + school.density_contribution
    assert total == pytest.approx(school.score, abs=0.2)
    assert school.decay_km == FACILITY_CONFIGS["schools"].decay_constant


def test_category_and_overall_weights_exposed():
    data = _report([make_facility("schools", 0.5)], ["schools"])
    edu = next(c for c in data.categories if c.category == "education")
    assert edu.weight_in_overall_pct == 100.0  # only scored category
    assert (
        next(f for f in edu.facilities if f.facility_type == "schools").weight_in_category_pct > 0
    )


def test_unchecked_category_not_scored_and_no_hint():
    data = _report([make_facility("schools", 0.5)], ["schools"])
    unchecked = [f for f in data.facilities if f.status == "not_checked"]
    assert unchecked
    assert all(f.score is None and f.hint is None for f in unchecked)


def test_far_facility_gets_hint_with_gain_matching_rescore():
    config = build_test_scoring_config()
    cfg = config.facility_configs["gps"]
    far = cfg.reference_radius * 4
    data = _report([make_facility("gps", far)], ["gps"])
    gp = next(f for f in data.facilities if f.facility_type == "gps")
    assert gp.score < LOW_SCORE_THRESHOLD
    assert gp.hint and gp.hint.startswith("Low:") and "would add" in gp.hint

    # Re-score with a GP at the reference radius added; the hint's gain must match.
    svc = LocationScoringService(
        config.facility_configs, config.category_facility_weights, config.category_weights
    )
    near = svc.score(
        [make_facility("gps", far), make_facility("gps", cfg.reference_radius)], ["gps"]
    )
    new = next(f for c in near.categories for f in c.facilities if f.facility_type == "gps").score
    claimed = int(gp.hint.split("~")[1].split(" ")[0])
    assert claimed == pytest.approx(new - gp.score, abs=2)


def test_zero_pois_hint_says_none_within_range():
    data = _report([], ["gps"])
    gp = next(f for f in data.facilities if f.facility_type == "gps")
    assert gp.score == 0.0
    assert "no" in gp.hint and "within" in gp.hint


def test_high_score_has_no_hint():
    data = _report([make_facility("schools", 0.05 * i + 0.1) for i in range(12)], ["schools"])
    school = next(f for f in data.facilities if f.facility_type == "schools")
    assert school.score >= LOW_SCORE_THRESHOLD
    assert school.hint is None
    assert data.gaps == [] or all(g.facility_type != "schools" for g in data.gaps)


def test_threshold_boundary():
    data = _report([make_facility("gps", 5.0)], ["gps"])
    gp = next(f for f in data.facilities if f.facility_type == "gps")
    cfg = FACILITY_CONFIGS["gps"]
    result = FacilityScoreResult(
        facilityType="gps",
        status="scored",
        score=gp.score,
        nearestDistanceKm=gp.nearest_km,
        count=gp.count,
        explanation="",
        proximityScore=gp.proximity_score,
        densityScore=gp.density_score,
        proximityWeight=gp.proximity_weight,
        densityWeight=gp.density_weight,
    )
    assert build_hint(result, cfg, threshold=gp.score + 0.1) is not None
    assert build_hint(result, cfg, threshold=gp.score) is None


def test_empty_analysis_has_null_overall():
    data = _report([], [])
    assert data.overall is None
    assert data.strengths == []
    assert data.features == []


def test_best_of_both_leg_uses_drive_decay():
    cfg = FACILITY_CONFIGS["railway_stations"]
    data = _report(
        [make_facility("railway_stations", None, walk_distance_km=None, drive_distance_km=20.0)],
        ["railway_stations"],
    )
    rail = next(f for f in data.facilities if f.facility_type == "railway_stations")
    assert rail.leg == "drive"
    assert rail.decay_km == cfg.drive_decay_constant
