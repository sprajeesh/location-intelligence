import math
from typing import Any

from fastapi.encoders import jsonable_encoder

_MASKED_REPORTER_EMAIL = "***"
# The field name in both camelCase (the wire format) and snake_case (the Python name).
_REPORTER_EMAIL_KEYS = frozenset({"reporterEmail", "reporter_email"})


def validation_error_detail(raw_errors: list[Any]) -> list[dict[str, Any]]:
    """The `detail` list for a 422 response, built from Pydantic's exc.errors().

    Makes the payload safe to serialize and to return: non-finite floats become
    strings, and a submitted reporter email is masked (see _mask_reporter_email).
    """
    errors = _sanitize_non_finite_floats(jsonable_encoder(raw_errors))
    return _mask_reporter_email(errors)


def _mask_reporter_email(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Blank out a submitted reporter email wherever a validation error echoes it.

    Field-level errors echo the value in `input` when the field is `reporterEmail`.
    Model-level errors (the per-type rules) echo the whole body, so the email
    key is masked inside that dict too. The error messages themselves never
    contain the value.
    """
    masked: list[dict[str, Any]] = []
    for error in errors:
        error = dict(error)
        if error.get("loc") and error["loc"][-1] in _REPORTER_EMAIL_KEYS:
            error["input"] = _MASKED_REPORTER_EMAIL
        elif isinstance(error.get("input"), dict):
            error["input"] = {
                key: (_MASKED_REPORTER_EMAIL if key in _REPORTER_EMAIL_KEYS else value)
                for key, value in error["input"].items()
            }
        masked.append(error)
    return masked


def _sanitize_non_finite_floats(value: Any) -> Any:
    """Pydantic echoes the raw rejected input back in RequestValidationError.errors()
    (e.g. `categoryWeights: {"education": NaN}`). Starlette's default JSONResponse
    renders with allow_nan=False (per the JSON spec), so a NaN/Infinity input would
    otherwise crash the 422 response itself with an unhandled ValueError instead of
    reporting the validation failure. Stringify non-finite floats wherever they
    appear in the error payload so the response can actually be serialized."""
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, dict):
        return {key: _sanitize_non_finite_floats(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_non_finite_floats(item) for item in value]
    return value
