import math
from dataclasses import replace
from difflib import SequenceMatcher

from app.clients.osrm import haversine_km
from app.config.scoring_config import FacilityConfig
from app.models.domain import CategoryScore, CompositeScore, Facility, FacilityScore

DEDUPE_DISTANCE_KM = 0.1  # ~100m
NAME_SIMILARITY_THRESHOLD = 0.8

# FacilityConfig.saturation_point is documented as the density_raw value where
# density scoring reaches ~95/100. A bare 1 - e^-x only reaches ~63% at x=1,
# so the exponent is scaled by -ln(0.05) to actually hit that target.
SATURATION_CURVE_STEEPNESS = -math.log(0.05)


def _same_facility(a: Facility, b: Facility) -> bool:
    """Two POIs are the same physical facility if they're within ~100m and
    have matching/similar names (or both unnamed) — e.g. opposite-direction
    bus stops on the same route, or a duplicate OSM way/node pair."""
    if haversine_km(a.lat, a.lon, b.lat, b.lon) > DEDUPE_DISTANCE_KM:
        return False

    name_a, name_b = a.name.strip().lower(), b.name.strip().lower()
    if name_a == name_b:
        return True
    if name_a.startswith("unnamed") and name_b.startswith("unnamed"):
        return True
    return SequenceMatcher(None, name_a, name_b).ratio() >= NAME_SIMILARITY_THRESHOLD


def _min_non_null(a: float | None, b: float | None) -> float | None:
    values = [v for v in (a, b) if v is not None]
    return min(values) if values else None


def dedupe_pois(facilities: list[Facility]) -> list[Facility]:
    """Collapse near-duplicate POIs (same facility, or opposite-direction stops
    on the same route) into one entry each, so they count once for density.

    When duplicates carry different distance values (e.g. distances computed
    from different OSM nodes for what's really one place), the retained entry
    keeps the minimum non-null distance per leg, independent of input order.
    """
    deduped: list[Facility] = []
    for facility in facilities:
        match_index = next(
            (i for i, kept in enumerate(deduped) if _same_facility(facility, kept)), None
        )
        if match_index is None:
            deduped.append(facility)
            continue
        kept = deduped[match_index]
        deduped[match_index] = replace(
            kept,
            distance_km=_min_non_null(kept.distance_km, facility.distance_km),
            walk_distance_km=_min_non_null(kept.walk_distance_km, facility.walk_distance_km),
            drive_distance_km=_min_non_null(kept.drive_distance_km, facility.drive_distance_km),
        )
    return deduped


def _proximity_and_density(
    nearest_distance: float,
    poi_distances: list[float],
    decay_constant: float,
    hard_cutoff: float,
    saturation_point: float,
    count_ceiling: float | None,
) -> tuple[float, float]:
    proximity_score = math.exp(-nearest_distance / decay_constant) * 100

    density_raw = sum(math.exp(-d / decay_constant) for d in poi_distances if d <= hard_cutoff)
    if count_ceiling is not None:
        density_raw = min(density_raw, count_ceiling)
    density_score = 100 * (
        1 - math.exp(-SATURATION_CURVE_STEEPNESS * density_raw / saturation_point)
    )

    return proximity_score, density_score


def facility_score(
    nearest_distance: float, poi_distances: list[float], cfg: FacilityConfig
) -> float:
    """Blend proximity (nearest POI) and density (how many are in range) for
    one facility type. `poi_distances` must already be deduplicated.

    Soft cutoffs only: `hard_cutoff` gates which POIs contribute to density,
    but proximity decays smoothly with no cliff at any radius.
    """
    proximity_score, density_score = _proximity_and_density(
        nearest_distance,
        poi_distances,
        cfg.decay_constant,
        cfg.hard_cutoff,
        cfg.saturation_point,
        cfg.count_ceiling,
    )
    return (proximity_score * cfg.proximity_weight) + (density_score * cfg.density_weight)


def _facility_score_best_of_both(
    cfg: FacilityConfig,
    walk_distances: list[float],
    drive_distances: list[float],
) -> tuple[float, str, float]:
    """Compute both the walk and drive legs, take whichever produces the
    higher proximity sub-score. Returns (score, winning_leg, nearest_distance_km).
    Assumes at least one of walk_distances/drive_distances is non-empty.
    """
    walk_nearest = min(walk_distances) if walk_distances else None
    drive_nearest = min(drive_distances) if drive_distances else None

    walk_prox = walk_dens = 0.0
    if walk_nearest is not None:
        walk_prox, walk_dens = _proximity_and_density(
            walk_nearest,
            walk_distances,
            cfg.decay_constant,
            cfg.hard_cutoff,
            cfg.saturation_point,
            cfg.count_ceiling,
        )

    drive_prox = drive_dens = 0.0
    if drive_nearest is not None:
        assert cfg.drive_decay_constant is not None
        assert cfg.drive_hard_cutoff is not None
        drive_prox, drive_dens = _proximity_and_density(
            drive_nearest,
            drive_distances,
            cfg.drive_decay_constant,
            cfg.drive_hard_cutoff,
            cfg.saturation_point,
            cfg.count_ceiling,
        )

    if walk_nearest is not None and (drive_nearest is None or walk_prox >= drive_prox):
        score = walk_prox * cfg.proximity_weight + walk_dens * cfg.density_weight
        return score, "walk", walk_nearest

    score = drive_prox * cfg.proximity_weight + drive_dens * cfg.density_weight
    return score, "drive", drive_nearest  # drive_nearest is not None on this branch


def _pluralize(label: str) -> str:
    if label.endswith("y") and label[-2].lower() not in "aeiou":
        return label[:-1] + "ies"
    return label + "s"


def _explain(
    label: str,
    poi_distances: list[float],
    nearest_km: float,
    mode: str,
    reference_radius: float,
    hard_cutoff: float,
) -> str:
    """Plain-language description of the same distance/count data facility_score
    already used. `reference_radius` only shapes this text: POIs within it are
    described as the "typical range" count, POIs beyond it but still within
    `hard_cutoff` as an additional "further out" count. This is presentation
    only — it doesn't change the score or introduce any cliff. A POI just past
    reference_radius still contributes the same smoothly-decayed weight to
    density as one just inside it; only how it's *described* differs.
    """
    within_ref = sorted(d for d in poi_distances if d <= reference_radius)
    beyond_ref = sorted(d for d in poi_distances if reference_radius < d <= hard_cutoff)

    if not within_ref and not beyond_ref:
        return f"Nearest {label} is {nearest_km:.1f} km away by {mode}."

    if within_ref and beyond_ref:
        farthest = beyond_ref[-1]
        return (
            f"{len(within_ref)} {_pluralize(label)} within {reference_radius:.1f} km by {mode}, "
            f"plus {len(beyond_ref)} more up to {farthest:.1f} km away."
        )

    if within_ref:
        if len(within_ref) == 1:
            return f"Nearest {label} is {nearest_km:.1f} km away by {mode}."
        return f"{len(within_ref)} {_pluralize(label)} within {reference_radius:.1f} km by {mode}."

    # Only far-bucket POIs — none within reference_radius.
    alternatives = len(beyond_ref) - 1
    if alternatives <= 0:
        return f"Nearest {label} is {nearest_km:.1f} km away by {mode}."
    plural = "alternative" if alternatives == 1 else "alternatives"
    return (
        f"Nearest {label} is {nearest_km:.1f} km away by {mode}, "
        f"{alternatives} {plural} beyond {reference_radius:.1f} km."
    )


class LocationScoringService:
    """Three-layer scoring: facility -> category -> composite.

    - Facility layer: proximity/density blend per facility type, per facility_configs.
    - Category layer: weighted blend of member facility scores, per category_facility_weights.
    - Composite layer: weighted blend of category scores, per category_weights.

    At every layer, "not checked" (no data source available) is excluded and the
    remaining weights are renormalized. "Checked, zero found" is real signal — it
    scores 0 and stays in at full weight. See refactor spec §4.1.
    """

    def __init__(
        self,
        facility_configs: dict[str, FacilityConfig],
        category_facility_weights: dict[str, dict[str, float]],
        category_weights: dict[str, float],
    ) -> None:
        self._facility_configs = facility_configs
        self._category_facility_weights = category_facility_weights
        self._category_weights = category_weights

    def score(
        self,
        facilities: list[Facility],
        categories: list[str],
        unavailable: set[str] | None = None,
        category_weight_overrides: dict[str, float] | None = None,
    ) -> CompositeScore:
        unavailable = unavailable or set()
        requested = set(categories)

        by_type: dict[str, list[Facility]] = {}
        for facility in facilities:
            by_type.setdefault(facility.category, []).append(facility)

        facility_scores: dict[str, FacilityScore] = {}
        for facility_type in self._facility_configs:
            checked = facility_type in requested and facility_type not in unavailable
            facility_scores[facility_type] = self._score_facility(
                facility_type, by_type.get(facility_type, []), checked
            )

        category_results = [
            self._score_category(category, facility_scores)
            for category in self._category_facility_weights
        ]

        # Per-request override of the composite-layer weights (e.g. user-configured
        # category weightage from Settings). None/empty leaves self._category_weights
        # untouched (same dict object, not a copy) so the default path is unchanged.
        effective_category_weights = (
            self._category_weights
            if not category_weight_overrides
            else {**self._category_weights, **category_weight_overrides}
        )

        scored_categories = [c for c in category_results if c.status == "scored"]
        overall: float | None = None
        if scored_categories:
            weight_sum = sum(effective_category_weights[c.category] for c in scored_categories)
            if weight_sum > 0:
                weighted_total = sum(
                    c.score * effective_category_weights[c.category]  # type: ignore[operator]
                    for c in scored_categories
                )
                overall = round(weighted_total / weight_sum, 1)

        coverage = f"{len(scored_categories)}/{len(self._category_weights)}"

        return CompositeScore(overall=overall, coverage=coverage, categories=category_results)

    def _score_facility(
        self, facility_type: str, group: list[Facility], checked: bool
    ) -> FacilityScore:
        cfg = self._facility_configs[facility_type]
        label = cfg.singular_label

        if not checked:
            return FacilityScore(
                facility_type=facility_type,
                status="not_checked",
                score=None,
                nearest_distance_km=None,
                count=0,
                explanation=f"{label[0].upper() + label[1:]} not checked for this address.",
            )

        group = dedupe_pois(group)
        count = len(group)

        if cfg.distance_mode == "best_of_both":
            walk_distances = [f.walk_distance_km for f in group if f.walk_distance_km is not None]
            drive_distances = [
                f.drive_distance_km for f in group if f.drive_distance_km is not None
            ]
            if not walk_distances and not drive_distances:
                return FacilityScore(
                    facility_type=facility_type,
                    status="scored",
                    score=0.0,
                    nearest_distance_km=None,
                    count=count,
                    explanation=f"No {label} found nearby.",
                )
            score, leg, nearest = _facility_score_best_of_both(cfg, walk_distances, drive_distances)
            if leg == "walk":
                leg_distances, leg_reference_radius, leg_hard_cutoff = (
                    walk_distances,
                    cfg.reference_radius,
                    cfg.hard_cutoff,
                )
            else:
                assert cfg.drive_reference_radius is not None
                assert cfg.drive_hard_cutoff is not None
                leg_distances, leg_reference_radius, leg_hard_cutoff = (
                    drive_distances,
                    cfg.drive_reference_radius,
                    cfg.drive_hard_cutoff,
                )
            return FacilityScore(
                facility_type=facility_type,
                status="scored",
                score=round(score, 1),
                nearest_distance_km=round(nearest, 2),
                count=count,
                explanation=_explain(
                    label, leg_distances, nearest, leg, leg_reference_radius, leg_hard_cutoff
                ),
            )

        distances = [f.distance_km for f in group if f.distance_km is not None]
        if not distances:
            return FacilityScore(
                facility_type=facility_type,
                status="scored",
                score=0.0,
                nearest_distance_km=None,
                count=count,
                explanation=f"No {label} found nearby.",
            )

        nearest = min(distances)
        score = facility_score(nearest, distances, cfg)
        return FacilityScore(
            facility_type=facility_type,
            status="scored",
            score=round(score, 1),
            nearest_distance_km=round(nearest, 2),
            count=count,
            explanation=_explain(
                label, distances, nearest, cfg.distance_mode, cfg.reference_radius, cfg.hard_cutoff
            ),
        )

    def _score_category(
        self, category: str, facility_scores: dict[str, FacilityScore]
    ) -> CategoryScore:
        members = self._category_facility_weights[category]
        member_results = [facility_scores[facility_type] for facility_type in members]
        scored = [fs for fs in member_results if fs.status == "scored"]

        if not scored:
            return CategoryScore(
                category=category, status="not_checked", score=None, facilities=member_results
            )

        weight_sum = sum(members[fs.facility_type] for fs in scored)
        weighted_total = sum(
            fs.score * members[fs.facility_type]  # type: ignore[operator]
            for fs in scored
        )
        score = weighted_total / weight_sum if weight_sum > 0 else 0.0

        return CategoryScore(
            category=category, status="scored", score=round(score, 1), facilities=member_results
        )
