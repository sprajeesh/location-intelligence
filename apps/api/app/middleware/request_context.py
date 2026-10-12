"""Assigns each request an ID, echoes it, and writes one access log line per request.

Pure ASGI rather than BaseHTTPMiddleware so streaming responses are untouched.
The access log records the matched route template, never the raw path or the
query string: a caller can put an address in either, including on a 404.

Unhandled exceptions are answered and logged here rather than by an exception
handler: uvicorn logs any exception that escapes the app with its full message,
which would bypass exception_fields().
"""

import logging
import re
import time
import uuid

from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.logging_config import correlation_id_var, exception_fields, request_id_var

REQUEST_ID_HEADER = "X-Request-ID"
CORRELATION_ID_HEADER = "X-Correlation-ID"
_VALID_INCOMING_ID = re.compile(r"^[A-Za-z0-9-]{1,64}$")

logger = logging.getLogger(__name__)


def _incoming_id(scope: Scope, header: bytes) -> str | None:
    for name, value in scope.get("headers", []):
        if name == header:
            candidate = value.decode("latin-1")
            # Reject anything that could forge or break a log line.
            if _VALID_INCOMING_ID.fullmatch(candidate):
                return candidate
            return None
    return None


def _route_template(scope: Scope) -> str:
    """The matched route's template, e.g. /reports/{job_id}; a fixed value if none matches.

    Routing sets scope["route"] on a match. Matching the route list again would
    miss routes nested by include_router, which have no `path` of their own.
    """
    return getattr(scope.get("route"), "path", None) or "<unmatched>"


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _incoming_id(scope, b"x-request-id") or uuid.uuid4().hex
        # A correlation ID spans one user action. Without one, the request is its own action.
        correlation_id = _incoming_id(scope, b"x-correlation-id") or request_id
        request_token = request_id_var.set(request_id)
        correlation_token = correlation_id_var.set(correlation_id)
        started = time.perf_counter()
        status_code = 500
        response_started = False
        body_complete = False

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code, response_started, body_complete
            if message["type"] == "http.response.start":
                status_code = message["status"]
                response_started = True
                headers = MutableHeaders(scope=message)
                headers[REQUEST_ID_HEADER] = request_id
                headers[CORRELATION_ID_HEADER] = correlation_id
            elif message["type"] == "http.response.body" and not message.get("more_body", False):
                body_complete = True
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as exc:
            # Logged here, not re-raised: uvicorn would log the exception with its
            # full message, which exception_fields() deliberately leaves out.
            logger.error(
                "unhandled exception",
                extra={
                    "event": "unhandled_exception",
                    "method": scope.get("method"),
                    "route": _route_template(scope),
                    **exception_fields(exc),
                },
            )
            if not response_started:
                response = JSONResponse(
                    status_code=500,
                    content={"detail": "Internal server error", "requestId": request_id},
                    headers={REQUEST_ID_HEADER: request_id, CORRELATION_ID_HEADER: correlation_id},
                )
                status_code = 500
                await response(scope, receive, send)
            elif not body_complete:
                # Headers already went out, so a 500 is impossible. An empty final
                # chunk closes the response; the client sees it as truncated.
                await send({"type": "http.response.body", "body": b"", "more_body": False})
        finally:
            logger.info(
                "request completed",
                extra={
                    "event": "http.request",
                    "method": scope.get("method"),
                    "route": _route_template(scope),
                    "status": status_code,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                },
            )
            request_id_var.reset(request_token)
            correlation_id_var.reset(correlation_token)
