"""Unit tests for LocationScoringService."""

import pytest

from app.models.domain import Facility
from app.services.scoring import LocationScoringService


def make_facility(
    category: str,
    distance_km: float,
    fid: str | None = None,
    name: str = "Test Facility",
) -> Facility:
    fid = fid or f"osm_node_{category}_{int(distance_km * 100)}"
    return Facility(
        id=fid, name=name, category=category, lat=-36.0, lon=174.0, distance_km=distance_km
    )


@pytest.fixture
def svc() -> LocationScoringService:
    return LocationScoringService(alpha=0.6, beta=0.4, density_factor=10.0)


class TestCategoryScore:
    def test_perfect_score_one_facility_at_zero_distance(self, svc: LocationScoringService) -> None:
        # proximity = 100, density = min(100, 1*10) = 10
        # score = 0.6*100 + 0.4*10 = 64
        f = make_facility("schools", distance_km=0.0)
        result = svc._category_score([f], radius_km=10.0)
        assert result == pytest.approx(64.0)

    def test_zero_facilities_returns_zero(self, svc: LocationScoringService) -> None:
        result = svc._category_score([], radius_km=10.0)
        assert result == 0.0

    def test_facility_at_radius_boundary(self, svc: LocationScoringService) -> None:
        # proximity = max(0, 100*(1-10/10)) = 0
        f = make_facility("schools", distance_km=10.0)
        result = svc._category_score([f], radius_km=10.0)
        # proximity=0, density=min(100, 1*10)=10 → score=0.6*0 + 0.4*10=4.0
        assert result == pytest.approx(4.0)

    def test_facility_beyond_radius_clamps_proximity_to_zero(
        self, svc: LocationScoringService
    ) -> None:
        f = make_facility("schools", distance_km=15.0)
        result = svc._category_score([f], radius_km=10.0)
        # proximity = max(0, 100*(1-15/10)) = max(0, -50) = 0
        assert result >= 0.0

    def test_density_caps_at_100(self, svc: LocationScoringService) -> None:
        # 11 facilities * 10 = 110, capped to 100
        facilities = [
            make_facility("schools", distance_km=0.5, fid=f"osm_node_{i}") for i in range(11)
        ]
        result = svc._category_score(facilities, radius_km=10.0)
        # proximity=95, density=100 → 0.6*95 + 0.4*100 = 57 + 40 = 97
        assert result == pytest.approx(97.0)

    def test_zero_radius_returns_zero(self, svc: LocationScoringService) -> None:
        f = make_facility("schools", distance_km=0.0)
        result = svc._category_score([f], radius_km=0.0)
        assert result == 0.0


class TestOverallScore:
    def test_single_category_schools_maps_to_education(self, svc: LocationScoringService) -> None:
        f = make_facility("schools", distance_km=1.0)
        score = svc.score([f], categories=["schools"], radius_km=10.0)
        assert score.education is not None
        assert score.transport is None
        assert score.healthcare is None
        assert score.shopping is None

    def test_single_category_bus_stops_maps_to_transport(self, svc: LocationScoringService) -> None:
        f = make_facility("bus_stops", distance_km=1.0)
        score = svc.score([f], categories=["bus_stops"], radius_km=10.0)
        assert score.transport is not None
        assert score.education is None

    def test_no_facilities_returns_zero_scores(self, svc: LocationScoringService) -> None:
        score = svc.score([], categories=["schools", "bus_stops"], radius_km=10.0)
        assert score.education == pytest.approx(0.0)
        assert score.transport == pytest.approx(0.0)
        assert score.overall == pytest.approx(0.0)

    def test_overall_is_weighted_average_of_active(self, svc: LocationScoringService) -> None:
        school = make_facility("schools", distance_km=0.0, fid="s1")
        bus = make_facility("bus_stops", distance_km=0.0, fid="b1")
        score = svc.score([school, bus], categories=["schools", "bus_stops"], radius_km=10.0)

        # Both have same raw score (proximity=100, density=10 → 64.0)
        # weights: education=0.4, transport=0.3 → overall = (64*0.4 + 64*0.3)/(0.4+0.3) = 64.0
        assert score.overall == pytest.approx(64.0, rel=1e-2)

    def test_unknown_category_skipped(self, svc: LocationScoringService) -> None:
        score = svc.score([], categories=["unicorn"], radius_km=10.0)
        assert score.overall is None

    def test_coverage_format(self, svc: LocationScoringService) -> None:
        score = svc.score([], categories=["schools", "bus_stops"], radius_km=10.0)
        # "2/2" — 2 active dimensions requested, 2 unique dimensions
        assert "/" in score.coverage

    def test_all_weights_null_no_active_categories(self, svc: LocationScoringService) -> None:
        score = svc.score([], categories=[], radius_km=10.0)
        assert score.education is None
        assert score.transport is None
        assert score.healthcare is None
        assert score.shopping is None
        assert score.overall is None

    def test_custom_alpha_beta(self) -> None:
        svc = LocationScoringService(alpha=1.0, beta=0.0, density_factor=10.0)
        f = make_facility("schools", distance_km=5.0)
        # proximity=50, density=10, score=1.0*50+0.0*10=50
        raw = svc._category_score([f], radius_km=10.0)
        assert raw == pytest.approx(50.0)

    def test_multiple_facilities_uses_nearest_for_proximity(
        self, svc: LocationScoringService
    ) -> None:
        facilities = [
            make_facility("schools", distance_km=1.0, fid="s1"),
            make_facility("schools", distance_km=5.0, fid="s2"),
            make_facility("schools", distance_km=9.0, fid="s3"),
        ]
        result = svc._category_score(facilities, radius_km=10.0)
        # nearest=1.0km → proximity=90, density=min(100,30)=30
        # score=0.6*90 + 0.4*30 = 54+12=66
        assert result == pytest.approx(66.0)
