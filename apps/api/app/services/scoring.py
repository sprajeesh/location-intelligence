from app.models.domain import CategoryScore, Facility

# Maps OSM category id → score dimension key
CATEGORY_TO_DIMENSION: dict[str, str] = {
    "schools": "education",
    "bus_stops": "transport",
    "hospitals": "healthcare",
    "supermarkets": "shopping",
    "pharmacies": "healthcare",
    "universities": "education",
    "parks": "shopping",  # approximation; extend as needed
    "libraries": "education",
}

# Weight per dimension (must sum to 1.0 for implemented dimensions)
DIMENSION_WEIGHTS: dict[str, float] = {
    "education": 0.40,
    "transport": 0.30,
    "healthcare": 0.20,
    "shopping": 0.10,
}


class LocationScoringService:
    def __init__(
        self,
        alpha: float = 0.6,
        beta: float = 0.4,
        density_factor: float = 10.0,
    ) -> None:
        self.alpha = alpha
        self.beta = beta
        self.density_factor = density_factor

    def score(
        self,
        facilities: list[Facility],
        categories: list[str],
        radius_km: float,
    ) -> CategoryScore:
        """Compute a CategoryScore for the given facilities and requested categories.

        Only requested categories contribute to the score.
        Score keys are dimension names (education, transport, ...), not category names.
        """
        # Group facilities by category
        by_category: dict[str, list[Facility]] = {}
        for f in facilities:
            by_category.setdefault(f.category, []).append(f)

        # Determine which dimensions are active (requested and implemented)
        active_dimensions: dict[str, float] = {}  # dim → category score

        for cat in categories:
            dimension = CATEGORY_TO_DIMENSION.get(cat)
            if dimension is None:
                continue
            cat_facilities = by_category.get(cat, [])
            cat_score = self._category_score(cat_facilities, radius_km)
            # If multiple categories map to the same dimension, take the max
            if dimension in active_dimensions:
                active_dimensions[dimension] = max(active_dimensions[dimension], cat_score)
            else:
                active_dimensions[dimension] = cat_score

        # Build the score object
        total_implemented = len(
            set(CATEGORY_TO_DIMENSION.get(c) for c in categories if CATEGORY_TO_DIMENSION.get(c))
        )
        active_count = len(active_dimensions)

        def _dim(key: str) -> float | None:
            return round(active_dimensions[key], 1) if key in active_dimensions else None

        education = _dim("education")
        healthcare = _dim("healthcare")
        transport = _dim("transport")
        shopping = _dim("shopping")

        # Overall = weighted average of active dimensions
        overall: float | None = None
        if active_dimensions:
            weight_sum = sum(DIMENSION_WEIGHTS.get(dim, 0.0) for dim in active_dimensions)
            if weight_sum > 0:
                weighted_total = sum(
                    score * DIMENSION_WEIGHTS.get(dim, 0.0)
                    for dim, score in active_dimensions.items()
                )
                overall = round(weighted_total / weight_sum, 1)

        # Coverage: active / total possible dimensions for requested categories
        coverage = f"{active_count}/{total_implemented}"

        return CategoryScore(
            education=education,
            healthcare=healthcare,
            transport=transport,
            shopping=shopping,
            overall=overall,
            coverage=coverage,
        )

    def _category_score(self, facilities: list[Facility], radius_km: float) -> float:
        """Compute the blended score for a single category."""
        if not facilities or radius_km <= 0:
            return 0.0

        nearest_distance = min(f.distance_km for f in facilities)
        count = len(facilities)

        proximity_score = max(0.0, 100.0 * (1.0 - nearest_distance / radius_km))
        density_score = min(100.0, count * self.density_factor)

        return self.alpha * proximity_score + self.beta * density_score
