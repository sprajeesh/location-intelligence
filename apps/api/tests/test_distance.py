"""Unit tests for Haversine distance calculation."""

import math

import pytest

from app.clients.osrm import haversine_km


class TestHaversine:
    def test_same_point_is_zero(self) -> None:
        assert haversine_km(-36.848, 174.763, -36.848, 174.763) == pytest.approx(0.0, abs=1e-9)

    def test_known_distance_auckland_wellington(self) -> None:
        # Auckland CBD to Wellington CBD ≈ 493 km straight-line
        dist = haversine_km(-36.848, 174.763, -41.286, 174.776)
        assert 480 < dist < 510

    def test_known_short_distance(self) -> None:
        # Two points ~1.1 km apart in Auckland
        dist = haversine_km(-36.848, 174.763, -36.858, 174.763)
        assert 1.0 < dist < 1.2

    def test_symmetry(self) -> None:
        d1 = haversine_km(-36.848, 174.763, -36.858, 174.773)
        d2 = haversine_km(-36.858, 174.773, -36.848, 174.763)
        assert d1 == pytest.approx(d2, rel=1e-9)

    def test_north_south_pole(self) -> None:
        # Distance from north to south pole ≈ 20015 km (half Earth circumference)
        dist = haversine_km(90.0, 0.0, -90.0, 0.0)
        assert abs(dist - 20015) < 10

    def test_equator_crossing(self) -> None:
        # 1 degree of latitude ≈ 111.1 km
        dist = haversine_km(0.0, 0.0, 1.0, 0.0)
        assert pytest.approx(dist, rel=0.01) == 111.195

    def test_returns_float(self) -> None:
        result = haversine_km(-36.848, 174.763, -36.858, 174.773)
        assert isinstance(result, float)

    def test_non_negative(self) -> None:
        result = haversine_km(-36.848, 174.763, -36.858, 174.773)
        assert result >= 0.0

    def test_across_antimeridian(self) -> None:
        # Point near +180 and -180 should give a small distance
        dist = haversine_km(0.0, 179.9, 0.0, -179.9)
        assert dist < 30  # about 22 km

    def test_formula_components(self) -> None:
        """Verify intermediate values match the formula manually."""
        lat1, lon1, lat2, lon2 = -36.848, 174.763, -36.858, 174.773
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        expected = R * 2 * math.asin(math.sqrt(a))
        assert haversine_km(lat1, lon1, lat2, lon2) == pytest.approx(expected, rel=1e-9)
