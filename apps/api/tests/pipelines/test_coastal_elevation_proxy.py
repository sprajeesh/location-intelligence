"""Unit tests for the pure, network-free logic in
pipelines/hazard/coastal_elevation_proxy.py -- the scoring rule and the
DEM tile-selection helper. The WFS fetch, STAC traversal, rasterio COG
read, and DB upserts are real I/O and are verified manually (see the repo
root plan/README), matching generate_dummy_hazard.py having no tests for
its own DB-writing flow."""

from pipelines.hazard.coastal_elevation_proxy import (
    COASTAL_BUFFER_KM,
    ELEVATION_CAP_M,
    _find_covering_tile,
    _score_for_cell,
)


class TestScoreForCell:
    def test_at_coast_and_sea_level_scores_maximum(self) -> None:
        assert _score_for_cell(elevation_m=0.0, distance_km=0.0) == 100.0

    def test_beyond_buffer_returns_none(self) -> None:
        assert _score_for_cell(elevation_m=0.0, distance_km=COASTAL_BUFFER_KM + 0.01) is None

    def test_exactly_at_buffer_edge_is_still_scored(self) -> None:
        # elevation 0 at the buffer edge -> proximity_factor is 0, so score is 0,
        # not None -- being exactly on the boundary still means "covered by
        # the proxy", just with no proximity contribution.
        assert _score_for_cell(elevation_m=0.0, distance_km=COASTAL_BUFFER_KM) == 0.0

    def test_elevation_at_or_above_cap_removes_elevation_contribution(self) -> None:
        at_cap = _score_for_cell(elevation_m=ELEVATION_CAP_M, distance_km=0.0)
        above_cap = _score_for_cell(elevation_m=ELEVATION_CAP_M * 2, distance_km=0.0)
        assert at_cap == 0.0
        assert above_cap == 0.0

    def test_negative_elevation_clamped_to_zero_not_amplified(self) -> None:
        # A below-sea-level pixel (e.g. right at the water's edge) shouldn't
        # score *higher* than sea level itself.
        at_sea_level = _score_for_cell(elevation_m=0.0, distance_km=0.0)
        below_sea_level = _score_for_cell(elevation_m=-5.0, distance_km=0.0)
        assert below_sea_level == at_sea_level == 100.0

    def test_higher_elevation_scores_lower_at_same_distance(self) -> None:
        low = _score_for_cell(elevation_m=1.0, distance_km=2.0)
        high = _score_for_cell(elevation_m=8.0, distance_km=2.0)
        assert low is not None
        assert high is not None
        assert low > high

    def test_farther_from_coast_scores_lower_at_same_elevation(self) -> None:
        near = _score_for_cell(elevation_m=2.0, distance_km=1.0)
        far = _score_for_cell(elevation_m=2.0, distance_km=8.0)
        assert near is not None
        assert far is not None
        assert near > far


class TestFindCoveringTile:
    TILES = [
        ((174.0, -37.0, 174.5, -36.5), "tile_a.tiff"),
        ((174.5, -37.0, 175.0, -36.5), "tile_b.tiff"),
    ]

    def test_returns_the_tile_containing_the_point(self) -> None:
        assert _find_covering_tile(self.TILES, lat=-36.8, lon=174.2) == "tile_a.tiff"
        assert _find_covering_tile(self.TILES, lat=-36.8, lon=174.8) == "tile_b.tiff"

    def test_returns_none_when_point_is_outside_every_tile(self) -> None:
        assert _find_covering_tile(self.TILES, lat=-40.0, lon=170.0) is None

    def test_returns_none_for_empty_tile_list(self) -> None:
        assert _find_covering_tile([], lat=-36.8, lon=174.2) is None

    def test_point_on_a_shared_edge_matches_the_first_tile(self) -> None:
        # x=174.5 is the boundary between tile_a and tile_b -- both bboxes
        # are inclusive, so the first match wins deterministically.
        assert _find_covering_tile(self.TILES, lat=-36.8, lon=174.5) == "tile_a.tiff"
