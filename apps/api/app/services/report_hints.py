"""Low-score improvement hints for the intelligence report.

Hints are computed by re-running the real scoring math (`_proximity_and_density`,
`_blend_score`) on a hypothetical change, never from hard-coded text, so they stay
correct if the formula or the DB-loaded facility config changes.
"""

import math
from dataclasses import dataclass

from app.config.scoring_config import FacilityConfig
from app.schemas.responses import FacilityScoreResult
from app.services.scoring import SATURATION_CURVE_STEEPNESS, _blend_score

LOW_SCORE_THRESHOLD = 50.0


@dataclass(frozen=True)
class Hint:
    text: str
    gain: float  # estimated facility-score points gained by the suggested change


def _leg_params(cfg: FacilityConfig, leg: str | None) -> tuple[float, float, float, str]:
    """(decay, reference_radius, hard_cutoff, mode) for the leg that was scored."""
    if leg == "drive" and cfg.drive_decay_constant is not None:
        assert cfg.drive_reference_radius is not None
        assert cfg.drive_hard_cutoff is not None
        return cfg.drive_decay_constant, cfg.drive_reference_radius, cfg.drive_hard_cutoff, "drive"
    mode = "drive" if cfg.distance_mode == "drive" else "walk"
    return cfg.decay_constant, cfg.reference_radius, cfg.hard_cutoff, mode


def _raw_density_from_score(density_score: float, cfg: FacilityConfig) -> float:
    """Invert the saturation curve to recover the density_raw behind a score."""
    clamped = min(max(density_score, 0.0), 99.9)
    return -cfg.saturation_point * math.log(1 - clamped / 100) / SATURATION_CURVE_STEEPNESS


def _density_from_raw(raw: float, cfg: FacilityConfig) -> float:
    if cfg.count_ceiling is not None:
        raw = min(raw, cfg.count_ceiling)
    return 100 * (1 - math.exp(-SATURATION_CURVE_STEEPNESS * raw / cfg.saturation_point))


def build_hint(
    result: FacilityScoreResult,
    cfg: FacilityConfig,
    threshold: float = LOW_SCORE_THRESHOLD,
) -> Hint | None:
    """One-line "why it's low + what would raise it" for a scored, low facility.

    Returns None for unscored facilities, scores at/above `threshold`, or when no
    candidate change would add a point.
    """
    if result.status != "scored" or result.score is None or result.score >= threshold:
        return None

    label = cfg.singular_label
    decay, ref, cutoff, mode = _leg_params(cfg, result.leg)
    nearest = result.nearestDistanceKm
    proximity = result.proximityScore or 0.0
    density = result.densityScore or 0.0
    base_raw = _raw_density_from_score(density, cfg)

    # Hypothetical change: a POI at the reference radius. If the nearest POI is
    # farther out (or absent) it becomes the nearest, lifting proximity and density;
    # otherwise one more POI at that range lifts density only.
    new_poi_weight = math.exp(-ref / decay)
    new_density = _density_from_raw(base_raw + new_poi_weight, cfg)
    if nearest is None or nearest > ref:
        new_proximity = math.exp(-ref / decay) * 100
        change = f"one within {ref:g} km by {mode}"
    else:
        new_proximity = proximity
        change = f"one more within {ref:g} km by {mode}"
    candidates = [(_blend_score(new_proximity, new_density, cfg) - result.score, change)]

    gain, change = max(candidates, key=lambda c: c[0])
    if gain < 1:
        return None
    gain = round(gain)

    if nearest is None:
        why = f"no {label} within {cutoff:g} km by {mode}"
    elif nearest > ref:
        why = f"nearest {label} is {nearest:.1f} km away by {mode}"
    else:
        why = f"only {result.count} {label}{'' if result.count == 1 else 's'} nearby (low density)"

    return Hint(text=f"Low: {why}; {change} would add ~{gain} points.", gain=float(gain))
