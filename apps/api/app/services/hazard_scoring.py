import h3

from app.config.hazard_config_loader import HazardScoringConfig
from app.models.domain import HazardScore, HazardSubScore
from app.repositories.db.hazard_repository import HazardRepository


def weighted_composite_score(scores: list[float], weights: list[float]) -> float:
    """Weighted mean of per-hazard scores by each hazard type's
    default_weight, falling back to an unweighted mean when every weight is
    zero (a hazard type is never disabled, but a 0 default_weight for a proxy
    type shouldn't crash the composite). Shared by HazardScoringService and
    the GET /hazard/cells map layer so the two composites never diverge."""
    weight_sum = sum(weights)
    if weight_sum > 0:
        return sum(s * w for s, w in zip(scores, weights, strict=True)) / weight_sum
    return sum(scores) / len(scores)


class HazardScoringService:
    """Point-based hazard scoring, deliberately separate from
    LocationScoringService -- hazard exposure is never blended into the
    facility `overall` score (see HAZARD.md's warning that averaging a
    catastrophic risk with unrelated low risks hides it).

    Composite and worst-hazard are computed here, at request time, from
    weights loaded once at startup -- never precomputed/stored on the cell
    -- so a future user-adjustable weighting UI never requires a backfill.
    """

    def __init__(self, hazard_repo: HazardRepository, hazard_config: HazardScoringConfig) -> None:
        self._hazard_repo = hazard_repo
        self._hazard_config = hazard_config

    async def score_point(self, lat: float, lon: float) -> HazardScore | None:
        """Returns None when the resolved cell has no hazard rows yet (e.g.
        outside the Phase-0 scaffold's demo bbox) -- an honest "no coverage"
        state, not an error, matching facility scoring's own not_checked
        status for a data source that wasn't queried."""
        h3_index = h3.latlng_to_cell(lat, lon, self._hazard_config.resolution)
        rows = await self._hazard_repo.fetch_cell_scores(h3_index)
        if not rows:
            return None

        hazard_types = self._hazard_config.hazard_types
        sub_scores = [
            HazardSubScore(
                hazard_type=row["hazard_type_slug"],
                score=float(row["score"]),
                severe=row["severe"],
                is_proxy=hazard_types[row["hazard_type_slug"]].is_proxy,
                source_name=row["source_name"],
                licence=row["licence"],
                data_currency_date=row["data_currency_date"],
            )
            for row in rows
        ]

        composite = weighted_composite_score(
            [s.score for s in sub_scores],
            [hazard_types[s.hazard_type].default_weight for s in sub_scores],
        )

        worst = max(sub_scores, key=lambda s: s.score)

        return HazardScore(
            h3_index=h3_index,
            resolution=self._hazard_config.resolution,
            composite_score=round(composite, 1),
            worst_hazard_type=worst.hazard_type,
            worst_hazard_score=worst.score,
            any_severe=any(s.severe for s in sub_scores),
            hazards=sub_scores,
        )
