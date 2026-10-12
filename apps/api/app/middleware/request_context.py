"""Assigns each request an ID, echoes it, and writes one access log line per request.

Pure ASGI rather than BaseHTTPMiddleware so streaming responses are untouched.
The access log records the path only -- never the query string, because
/search/address carries the typed address in `q`.

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

from app.logging_config import exception_fields, request_id_var

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_INCOMING_ID = re.compile(r"^[A-Za-z0-9-]{1,64}$")

logger = logging.getLogger(__name__)


def _incoming_request_id(scope: Scope) -> str | None:
    for name, value in scope.get("headers", []):
        if name == b"x-request-id":
            candidate = value.decode("latin-1")
            # Reject anything that could forge or break a log line.
            if _VALID_INCOMING_ID.fullmatch(candidate):
                return candidate
            return None
    return None


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _incoming_request_id(scope) or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_code = 500
        response_started = False

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code, response_started
            if message["type"] == "http.response.start":
                status_code = message["status"]
                response_started = True
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as exc:
            if response_started:
                # Too late for a 500 body; let the server close the connection.
                raise
            logger.error(
                "unhandled exception",
                extra={
                    "event": "unhandled_exception",
                    "method": scope.get("method"),
                    "path": scope.get("path"),
                    **exception_fields(exc),
                },
            )
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "requestId": request_id},
                headers={REQUEST_ID_HEADER: request_id},
            )
            status_code = 500
            await response(scope, receive, send)
        finally:
            logger.info(
                "request completed",
                extra={
                    "event": "http.request",
                    "method": scope.get("method"),
                    "path": scope.get("path"),
                    "status": status_code,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                },
            )
            request_id_var.reset(token)
