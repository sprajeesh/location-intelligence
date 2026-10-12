"""Structured logging: one JSON object per line, tagged with request and correlation IDs.

Records get their IDs from `request_id_var` and `correlation_id_var`, which the
request context middleware (app/middleware/request_context.py) sets for the life
of each request. A correlation ID spans one user action, which can be several requests.
Call sites add a stable `event` tag and safe context via `extra=`, e.g.
`logger.warning("...", extra={"event": "overpass.batch_failed"})`.
"""

import contextvars
import json
import logging
import traceback
from datetime import UTC, datetime

from app.config.settings import Settings

request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)
correlation_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "correlation_id", default=None
)

_HANDLER_MARK = "_li_structured_handler"
_UVICORN_LOGGERS = ("uvicorn", "uvicorn.error")

# Attributes every LogRecord has. Anything else on a record came from `extra=`.
_STANDARD_ATTRS = set(logging.LogRecord("", logging.INFO, "", 0, "", (), None).__dict__) | {
    "message",
    "asctime",
    "request_id",
    "correlation_id",
}


class TraceContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        record.correlation_id = correlation_id_var.get()
        return True


def exception_fields(exc: BaseException) -> dict[str, str]:
    """Log fields for a caught exception: its type and stack frames, never its message.

    Driver, httpx and SQLAlchemy messages embed SQL parameters (the typed
    address), request URLs (the LINZ key) and similar. Pass the result via
    `extra=` alongside an `event` tag.
    """
    return {
        "error_type": type(exc).__name__,
        "stack": "".join(traceback.format_tb(exc.__traceback__)).rstrip(),
    }


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "event": getattr(record, "event", None),
            "request_id": record.request_id,
            "correlation_id": record.correlation_id,
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_ATTRS and key not in payload:
                payload[key] = value
        return json.dumps(payload, default=str)


def configure_logging(settings: Settings) -> None:
    """Install the structured handler on the root logger and on uvicorn's loggers.

    Idempotent: replaces only the handler this function installed earlier, so
    pytest's caplog handler on the root logger survives repeated create_app() calls.
    """
    if settings.log_format == "json":
        formatter: logging.Formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s [%(request_id)s %(correlation_id)s] %(message)s"
        )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(TraceContextFilter())
    setattr(handler, _HANDLER_MARK, True)

    root = logging.getLogger()
    for existing in list(root.handlers):
        if getattr(existing, _HANDLER_MARK, False):
            root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())

    # uvicorn installs its own handlers and stops propagation at import time, so
    # route its error logs through ours too. Its access log is replaced by the
    # request context middleware's access line, so silence it here rather than
    # relying on a --no-access-log flag in the Dockerfile.
    for name in _UVICORN_LOGGERS:
        uvicorn_logger = logging.getLogger(name)
        for existing in list(uvicorn_logger.handlers):
            uvicorn_logger.removeHandler(existing)
        uvicorn_logger.addHandler(handler)
        uvicorn_logger.propagate = False
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    # httpx logs every outgoing request URL at INFO. The LINZ key travels in a
    # query string, so these lines must stay off.
    for name in ("httpx", "httpcore"):
        logging.getLogger(name).setLevel(logging.WARNING)
