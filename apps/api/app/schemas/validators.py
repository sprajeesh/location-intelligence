import math
import re

# Deliberately simple: one "@", no whitespace, a dot in the domain. Real validity
# is only provable by delivery; this just rejects obvious typos and newlines.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def dedupe_categories(value: list[str] | None) -> list[str] | None:
    """Drop blank entries and duplicates, keeping first-seen order."""
    if value is None:
        return None
    cleaned = [category.strip() for category in value if category.strip()]
    return list(dict.fromkeys(cleaned))


def bound_category_weights(value: dict[str, float] | None) -> dict[str, float] | None:
    if value is None:
        return None
    if len(value) > 10:  # today's real composite-category count is 5
        raise ValueError("category_weights has too many entries")
    for category, weight in value.items():
        if not category.strip():
            raise ValueError("category_weights keys must be non-empty")
        if not math.isfinite(weight):
            raise ValueError(f"category_weights[{category}] must be finite")
        if not (0.0 <= weight <= 1.0):
            raise ValueError(f"category_weights[{category}] must be between 0.0 and 1.0")
    return value
