"""Unit tests for the facility -> category -> composite scoring pipeline."""

import itertools

import pytest
from pydantic import ValidationError

from app.config.scoring_config import (
    CATEGORY_FACILITY_WEIGHTS,
    CATEGORY_WEIGHTS,
    FACILITY_CONFIGS,
    FacilityConfig,
    fetch_radius_km,
)
from app.models.domain import Facility
from app.services.scoring import (
    LocationScoringService,
    _proximity_and_density,
    dedupe_pois,
    facility_score,
)

# Distinct synthetic POIs must not collide under dedupe_pois (which matches on
# real proximity, not on the test-double distance_km field), so give each
# facility its own coordinate by default, ~1.1km apart — well past
# DEDUPE_DISTANCE_KM (0.1km). Tests that specifically exercise dedup pass
# lat/lon explicitly instead.
_position_counter = itertools.count()


def make_facility(
    category: str,
    distance_km: float | None = None,
    fid: str | None = None,
    name: str = "Test Facility",
    lat: float | None = None,
    lon: float | None = None,
    walk_distance_km: float | None = None,
    drive_distance_km: float | None = None,
) -> Facility:
    fid = fid or f"osm_node_{category}_{name}_{distance_km}"
    if lat is None and lon is None:
        lat = -36.0 + next(_position_counter) * 0.01
        lon = 174.0
    return Facility(
        id=fid,
        name=name,
        category=category,
        lat=lat if lat is not None else -36.0,
        lon=lon if lon is not None else 174.0,
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

    def test_recreation_category_has_parks_playgrounds_and_libraries(self) -> None:
        assert CATEGORY_FACILITY_WEIGHTS["recreation"] == {
            "parks": 0.40,
            "playgrounds": 0.20,
            "libraries": 0.40,
        }

    def test_shopping_category_only_supermarkets(self) -> None:
        assert CATEGORY_FACILITY_WEIGHTS["shopping"] == {"supermarkets": 1.0}

    def test_railway_stations_use_best_of_both(self) -> None:
        assert FACILITY_CONFIGS["railway_stations"].distance_mode == "best_of_both"


class TestFacilityScoreFormula:
    def test_matches_formula_at_zero_distance(self) -> None:
        cfg = FACILITY_CONFIGS["schools"]
        result = facility_score(0.0, [0.0], cfg)

        proximity, density = _proximity_and_density(
            0.0, [0.0], cfg.decay_constant, cfg.hard_cutoff, cfg.saturation_point, cfg.count_ceiling
        )
        expected = proximity * cfg.proximity_weight + density * cfg.density_weight

        assert result == pytest.approx(expected)

    def test_density_score_reaches_95_at_saturation_point(self) -> None:
        cfg = FACILITY_CONFIGS["schools"]
        assert cfg.count_ceiling is None  # so density_raw isn't clipped below saturation_point

        # `saturation_point` facilities right on top of the address (distance 0)
        # push density_raw to exactly saturation_point (each contributes e^0 == 1).
        poi_distances = [0.0] * int(cfg.saturation_point)

        _, density_score = _proximity_and_density(
            0.0, poi_distances, cfg.decay_constant, cfg.hard_cutoff, cfg.saturation_point, None
        )

        assert density_score == pytest.approx(95, abs=0.1)

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

    def test_merge_keeps_minimum_distance_regardless_of_input_order(self) -> None:
        near = make_facility(
            "bus_stops", fid="near", name="Queen St Stop", lat=-36.0000, lon=174.0, distance_km=0.5
        )
        far = make_facility(
            "bus_stops", fid="far", name="Queen St Stop", lat=-36.0005, lon=174.0, distance_km=2.0
        )

        forward = dedupe_pois([near, far])
        reversed_order = dedupe_pois([far, near])

        assert len(forward) == len(reversed_order) == 1
        assert forward[0].distance_km == pytest.approx(0.5)
        assert reversed_order[0].distance_km == pytest.approx(0.5)

    def test_merge_keeps_minimum_walk_and_drive_distance_independently(self) -> None:
        a = make_facility(
            "railway_stations",
            fid="a",
            name="Central Station",
            lat=-36.0000,
            lon=174.0,
            walk_distance_km=1.5,
            drive_distance_km=4.0,
        )
        b = make_facility(
            "railway_stations",
            fid="b",
            name="Central Station",
            lat=-36.0005,
            lon=174.0,
            walk_distance_km=2.5,
            drive_distance_km=3.0,
        )

        result = dedupe_pois([a, b])

        assert len(result) == 1
        assert result[0].walk_distance_km == pytest.approx(1.5)
        assert result[0].drive_distance_km == pytest.approx(3.0)


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
        assert (
            fetch_radius_km(FACILITY_CONFIGS, "schools", 10.0)
            == FACILITY_CONFIGS["schools"].hard_cutoff
        )

    def test_narrows_to_requested_radius_when_smaller_than_hard_cutoff(self) -> None:
        assert fetch_radius_km(FACILITY_CONFIGS, "schools", 2.0) == 2.0

    def test_best_of_both_covers_the_farther_of_walk_and_drive_legs(self) -> None:
        cfg = FACILITY_CONFIGS["railway_stations"]
        assert fetch_radius_km(FACILITY_CONFIGS, "railway_stations", 100.0) == cfg.drive_hard_cutoff

    def test_unconfigured_facility_type_passes_through_requested_radius(self) -> None:
        assert fetch_radius_km(FACILITY_CONFIGS, "made_up_type", 7.0) == 7.0


def _base_facility_config_kwargs() -> dict:
    return {
        "distance_mode": "walk",
        "decay_constant": 0.4,
        "reference_radius": 1.0,
        "hard_cutoff": 3.0,
        "saturation_point": 3,
        "proximity_weight": 0.5,
        "density_weight": 0.5,
        "label": "Test Facilities",
        "singular_label": "test facility",
        "color": "#000000",
        "implemented": True,
        "composite_category": "test_category",
        "category_weight": 1.0,
        "osm_tags": [("amenity", "test")],
    }


class TestReferenceRadiusValidator:
    def test_hard_cutoff_equal_to_reference_radius_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            FacilityConfig(**{**_base_facility_config_kwargs(), "hard_cutoff": 1.0})

    def test_hard_cutoff_below_reference_radius_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            FacilityConfig(**{**_base_facility_config_kwargs(), "hard_cutoff": 0.5})

    def test_drive_hard_cutoff_must_exceed_drive_reference_radius(self) -> None:
        with pytest.raises(ValidationError):
            FacilityConfig(
                **{
                    **_base_facility_config_kwargs(),
                    "distance_mode": "best_of_both",
                    "drive_decay_constant": 3,
                    "drive_reference_radius": 5,
                    "drive_hard_cutoff": 5,  # not strictly greater -> invalid
                }
            )

    def test_all_configured_facilities_satisfy_the_relationship(self) -> None:
        for facility_type, cfg in FACILITY_CONFIGS.items():
            assert cfg.hard_cutoff > cfg.reference_radius, facility_type
            if cfg.drive_hard_cutoff is not None:
                assert cfg.drive_hard_cutoff > cfg.drive_reference_radius, facility_type


class TestExplanationBucketing:
    """§2/§5 follow-up: reference_radius drives explanation-string bucketing
    only — it must never reintroduce a cliff in the actual score."""

    def test_schools_explanation_splits_near_and_far_buckets(
        self, svc: LocationScoringService
    ) -> None:
        facilities = [
            make_facility("schools", distance_km=0.2, fid="s1"),
            make_facility("schools", distance_km=0.5, fid="s2"),
            make_facility("schools", distance_km=0.9, fid="s3"),
            make_facility("schools", distance_km=2.8, fid="s4"),  # beyond reference_radius (1.0km)
        ]
        score = svc.score(facilities, categories=["schools"], unavailable=set())
        education = next(c for c in score.categories if c.category == "education")
        schools_fs = next(f for f in education.facilities if f.facility_type == "schools")

        assert "3 schools within 1.0 km" in schools_fs.explanation
        assert "1 more up to 2.8 km away" in schools_fs.explanation

    def test_poi_near_reference_radius_boundary_shifts_bucket_not_score(
        self, svc: LocationScoringService
    ) -> None:
        cfg = FACILITY_CONFIGS["schools"]
        just_inside = cfg.reference_radius - 0.01
        just_outside = cfg.reference_radius + 0.01
        anchor = 0.1  # always within reference_radius; keeps `nearest` identical in both cases

        inside_facilities = [
            make_facility("schools", distance_km=anchor, fid="anchor"),
            make_facility("schools", distance_km=just_inside, fid="boundary"),
        ]
        outside_facilities = [
            make_facility("schools", distance_km=anchor, fid="anchor"),
            make_facility("schools", distance_km=just_outside, fid="boundary"),
        ]

        def schools_result(facilities: list[Facility]):
            score = svc.score(facilities, categories=["schools"], unavailable=set())
            education = next(c for c in score.categories if c.category == "education")
            return next(f for f in education.facilities if f.facility_type == "schools")

        inside_fs = schools_result(inside_facilities)
        outside_fs = schools_result(outside_facilities)

        # Different explanation buckets either side of reference_radius...
        assert "2 schools within 1.0 km" in inside_fs.explanation
        assert "plus 1 more up to" in outside_fs.explanation

        # ...but no discontinuity in the actual score (hard_cutoff, not
        # reference_radius, gates the density sum — both POIs are well within it).
        assert abs(inside_fs.score - outside_fs.score) < 1.0
