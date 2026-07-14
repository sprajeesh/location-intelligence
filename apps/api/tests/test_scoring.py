"""Unit tests for the facility -> category -> composite scoring pipeline."""

import math

import pytest

from app.config.scoring_config import (
    CATEGORY_FACILITY_WEIGHTS,
    CATEGORY_WEIGHTS,
    FACILITY_CONFIGS,
    fetch_radius_km,
)
from app.models.domain import Facility
from app.services.scoring import LocationScoringService, dedupe_pois, facility_score


def make_facility(
    category: str,
    distance_km: float | None = None,
    fid: str | None = None,
    name: str = "Test Facility",
    lat: float = -36.0,
    lon: float = 174.0,
    walk_distance_km: float | None = None,
    drive_distance_km: float | None = None,
) -> Facility:
    fid = fid or f"osm_node_{category}_{name}_{distance_km}"
    return Facility(
        id=fid,
        name=name,
        category=category,
        lat=lat,
        lon=lon,
        distance_km=distance_km,
        walk_distance_km=walk_distance_km,
        drive_distance_km=drive_distance_km,
    )


@pytest.fixture
def svc() -> LocationScoringService:
    return LocationScoringService()


class TestConfig:
    def test_category_weights_sum_to_one(self) -> None:
        assert sum(CATEGORY_WEIGHTS.values()) == pytest.approx(1.0)

    def test_facility_weights_sum_to_one(self) -> None:
        for facility_type, cfg in FACILITY_CONFIGS.items():
            assert cfg.proximity_weight + cfg.density_weight == pytest.approx(1.0), facility_type

    def test_recreation_category_has_parks_and_libraries(self) -> None:
        assert CATEGORY_FACILITY_WEIGHTS["recreation"] == {"parks": 0.55, "libraries": 0.45}

    def test_shopping_category_only_supermarkets(self) -> None:
        assert CATEGORY_FACILITY_WEIGHTS["shopping"] == {"supermarkets": 1.0}

    def test_railway_stations_use_best_of_both(self) -> None:
        assert FACILITY_CONFIGS["railway_stations"].distance_mode == "best_of_both"


class TestFacilityScoreFormula:
    def test_matches_formula_at_zero_distance(self) -> None:
        cfg = FACILITY_CONFIGS["schools"]
        result = facility_score(0.0, [0.0], cfg)

        proximity = math.exp(0.0) * 100
        density_raw = math.exp(0.0)
        density = 100 * (1 - math.exp(-density_raw / cfg.saturation_point))
        expected = proximity * cfg.proximity_weight + density * cfg.density_weight

        assert result == pytest.approx(expected)

    def test_no_cliff_at_reference_radius(self) -> None:
        cfg = FACILITY_CONFIGS["schools"]
        near_ref = cfg.reference_radius * 0.9
        at_ref = cfg.reference_radius

        score_near = facility_score(near_ref, [near_ref], cfg)
        score_at = facility_score(at_ref, [at_ref], cfg)

        assert score_at > 0
        assert score_near != pytest.approx(score_at)
        assert abs(score_near - score_at) < 15  # smooth decay, no visible cliff

    def test_hard_cutoff_only_gates_density_not_proximity(self) -> None:
        cfg = FACILITY_CONFIGS["schools"]
        near = 0.2
        far_beyond_cutoff = cfg.hard_cutoff + 1.0

        with_far_poi = facility_score(near, [near, far_beyond_cutoff], cfg)
        without_far_poi = facility_score(near, [near], cfg)

        assert with_far_poi == pytest.approx(without_far_poi)

    def test_count_ceiling_caps_density_contribution(self) -> None:
        cfg = FACILITY_CONFIGS["universities"]  # count_ceiling=1
        # Both lists push raw density well past the ceiling of 1 — once capped,
        # adding more nearby universities should not raise the score further.
        many = facility_score(1.0, [0.1, 0.1, 0.1], cfg)
        even_more = facility_score(1.0, [0.1, 0.1, 0.1, 0.1, 0.1], cfg)
        assert even_more == pytest.approx(many)


class TestDedupePOIs:
    def test_near_duplicate_same_name_counts_once(self) -> None:
        a = make_facility("bus_stops", fid="a", name="Queen St Stop", lat=-36.0000, lon=174.0)
        b = make_facility("bus_stops", fid="b", name="Queen St Stop", lat=-36.0005, lon=174.0)
        assert len(dedupe_pois([a, b])) == 1

    def test_far_apart_same_name_counts_twice(self) -> None:
        a = make_facility("bus_stops", fid="a", name="Queen St Stop", lat=-36.0000, lon=174.0)
        b = make_facility("bus_stops", fid="b", name="Queen St Stop", lat=-36.0100, lon=174.0)
        assert len(dedupe_pois([a, b])) == 2

    def test_different_names_close_together_count_twice(self) -> None:
        a = make_facility("bus_stops", fid="a", name="Alpha", lat=-36.0000, lon=174.0)
        b = make_facility("bus_stops", fid="b", name="Zephyr Mart", lat=-36.0001, lon=174.0)
        assert len(dedupe_pois([a, b])) == 2

    def test_two_unnamed_close_together_count_once(self) -> None:
        a = make_facility("bus_stops", fid="a", name="Unnamed Bus Stops", lat=-36.0000, lon=174.0)
        b = make_facility("bus_stops", fid="b", name="Unnamed Bus Stops", lat=-36.0003, lon=174.0)
        assert len(dedupe_pois([a, b])) == 1


class TestNotCheckedVsCheckedZero:
    """§4.1 — highest priority correctness check in the refactor spec."""

    def test_checked_zero_hospitals_stays_in_composite_at_full_weight(
        self, svc: LocationScoringService
    ) -> None:
        score = svc.score([], categories=["hospitals", "pharmacies"], unavailable=set())
        healthcare = next(c for c in score.categories if c.category == "healthcare")
        hospitals_fs = next(f for f in healthcare.facilities if f.facility_type == "hospitals")

        assert hospitals_fs.status == "scored"
        assert hospitals_fs.score == 0.0
        assert healthcare.status == "scored"
        assert healthcare.score == 0.0

    def test_missing_pharmacy_data_source_rebalances_to_hospitals_only(
        self, svc: LocationScoringService
    ) -> None:
        hospital = make_facility("hospitals", distance_km=2.0, fid="h1")
        # pharmacies fetch errored -> not_checked, distinct from "checked, zero found"
        score = svc.score(
            [hospital], categories=["hospitals", "pharmacies"], unavailable={"pharmacies"}
        )
        healthcare = next(c for c in score.categories if c.category == "healthcare")
        pharmacies_fs = next(f for f in healthcare.facilities if f.facility_type == "pharmacies")
        hospitals_fs = next(f for f in healthcare.facilities if f.facility_type == "hospitals")

        assert pharmacies_fs.status == "not_checked"
        assert hospitals_fs.status == "scored"
        # fully renormalized onto hospitals alone
        assert healthcare.score == pytest.approx(hospitals_fs.score)

    def test_unrequested_category_is_not_checked(self, svc: LocationScoringService) -> None:
        score = svc.score([], categories=["schools"], unavailable=set())
        shopping = next(c for c in score.categories if c.category == "shopping")
        assert shopping.status == "not_checked"
        assert shopping.score is None

    def test_coverage_counts_scored_categories_out_of_five(
        self, svc: LocationScoringService
    ) -> None:
        score = svc.score([], categories=["schools"], unavailable=set())
        assert score.coverage == "1/5"


class TestBestOfBoth:
    def test_walk_leg_wins_when_closer(self, svc: LocationScoringService) -> None:
        station = make_facility(
            "railway_stations", fid="r1", walk_distance_km=0.3, drive_distance_km=8.0
        )
        score = svc.score([station], categories=["railway_stations"], unavailable=set())
        transport = next(c for c in score.categories if c.category == "transport")
        rs = next(f for f in transport.facilities if f.facility_type == "railway_stations")

        assert rs.status == "scored"
        assert "walk" in rs.explanation
        assert rs.nearest_distance_km == pytest.approx(0.3)

    def test_drive_leg_used_when_unreachable_on_foot(self, svc: LocationScoringService) -> None:
        station = make_facility(
            "railway_stations", fid="r2", walk_distance_km=None, drive_distance_km=4.0
        )
        score = svc.score([station], categories=["railway_stations"], unavailable=set())
        transport = next(c for c in score.categories if c.category == "transport")
        rs = next(f for f in transport.facilities if f.facility_type == "railway_stations")

        assert rs.status == "scored"
        assert "drive" in rs.explanation
        assert rs.nearest_distance_km == pytest.approx(4.0)


class TestOverallComposite:
    def test_no_categories_requested_returns_none(self, svc: LocationScoringService) -> None:
        score = svc.score([], categories=[], unavailable=set())
        assert score.overall is None
        assert score.coverage == "0/5"

    def test_overall_is_weighted_average_of_scored_categories(
        self, svc: LocationScoringService
    ) -> None:
        school = make_facility("schools", distance_km=0.0, fid="s1")
        bus = make_facility("bus_stops", distance_km=0.0, fid="b1")
        score = svc.score([school, bus], categories=["schools", "bus_stops"], unavailable=set())

        education = next(c for c in score.categories if c.category == "education")
        transport = next(c for c in score.categories if c.category == "transport")
        assert education.status == "scored"
        assert transport.status == "scored"

        weight_sum = CATEGORY_WEIGHTS["education"] + CATEGORY_WEIGHTS["transport"]
        expected = (
            education.score * CATEGORY_WEIGHTS["education"]
            + transport.score * CATEGORY_WEIGHTS["transport"]
        ) / weight_sum
        assert score.overall == pytest.approx(expected, rel=1e-2)


class TestFetchRadiusKm:
    def test_caps_to_hard_cutoff_when_requested_radius_is_larger(self) -> None:
        assert fetch_radius_km("schools", 10.0) == FACILITY_CONFIGS["schools"].hard_cutoff

    def test_narrows_to_requested_radius_when_smaller_than_hard_cutoff(self) -> None:
        assert fetch_radius_km("schools", 2.0) == 2.0

    def test_best_of_both_covers_the_farther_of_walk_and_drive_legs(self) -> None:
        cfg = FACILITY_CONFIGS["railway_stations"]
        assert fetch_radius_km("railway_stations", 100.0) == cfg.drive_hard_cutoff

    def test_unconfigured_facility_type_passes_through_requested_radius(self) -> None:
        assert fetch_radius_km("made_up_type", 7.0) == 7.0
