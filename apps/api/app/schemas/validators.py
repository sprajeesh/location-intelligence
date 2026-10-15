import math
import re

# Deliberately simple: one "@", no whitespace, a dot in the domain. Real validity
# is only provable by delivery; this just rejects obvious typos and newlines.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_OSM_ID_RE = re.compile(r"^(node|way|relation)/\d+$")
_SINGLE_LINE_ERROR = "must be a single line"


def strip_string(value: object) -> object:
    """Trim surrounding whitespace. Non-strings pass through for the type check."""
    return value.strip() if isinstance(value, str) else value


def require_finite(value: float) -> float:
    if not math.isfinite(value):
        raise ValueError("must be a finite number")
    return value


def clean_osm_id(value: object) -> object:
    """Trim, treat blank as not given, and require node/way/relation + digits."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("must be a string")
    value = value.strip()
    if value == "":
        return None
    if not _OSM_ID_RE.match(value):
        raise ValueError("must look like node/12345, way/12345 or relation/12345")
    return value


def clean_single_line_text(value: object) -> object:
    """Trim, treat blank as not given, and reject line breaks."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("must be a string")
    if "\r" in value or "\n" in value:
        raise ValueError(_SINGLE_LINE_ERROR)
    value = value.strip()
    return value or None


def clean_email(value: object) -> object:
    """Trim and treat blank as not given. The domain is lower-cased, since
    domain names are case-insensitive. The local part is kept as typed."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("must be a string")
    value = value.strip()
    if value == "":
        return None
    if "\r" in value or "\n" in value:
        raise ValueError(_SINGLE_LINE_ERROR)
    if not EMAIL_RE.match(value):
        raise ValueError("invalid email address")
    local, _, domain = value.rpartition("@")
    return f"{local}@{domain.lower()}"


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


def check_map_correction_type_rules(
    correction_type: str,
    *,
    target_osm_id: str | None,
    reason: str | None,
    name: str | None,
    address: str | None,
) -> None:
    """Which fields an `add` or `remove` correction may and must carry."""
    if correction_type == "add":
        if target_osm_id is not None:
            raise ValueError("targetOsmId is not allowed for add")
        if reason is not None:
            raise ValueError("reason is not allowed for add")
        return
    if target_osm_id is None:
        raise ValueError("targetOsmId is required for remove")
    if reason is None:
        raise ValueError("reason is required for remove")
    if name is not None:
        raise ValueError("name is not allowed for remove")
    if address is not None:
        raise ValueError("address is not allowed for remove")
