"""Structured logging: JSON output, request IDs, access log, unhandled-error handling.

Each test that checks log content uses a unique marker string and asserts it
never reaches the log, since addresses and contact details must not be logged.
"""

import asyncio
import json
import logging
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import DBAPIError

from app.logging_config import JsonFormatter, RequestIdFilter, exception_fields, request_id_var
from app.repositories.cache import CacheRepository
from app.repositories.db.address_repository import AddressRepository
from app.services.geocoding import GeocodingService


def _marker() -> str:
    return f"marker-{uuid.uuid4().hex}"


# --- formatter -------------------------------------------------------------------


def test_json_formatter_emits_tagged_fields_for_one_line() -> None:
    record = logging.LogRecord("app.x", logging.WARNING, __file__, 1, "Thing failed", (), None)
    record.event = "thing.failed"
    record.breaker = "osrm"
    record.request_id = "req-1"

    line = JsonFormatter().format(record)
    payload = json.loads(line)

    assert "\n" not in line
    assert payload["level"] == "WARNING"
    assert payload["message"] == "Thing failed"
    assert payload["event"] == "thing.failed"
    assert payload["request_id"] == "req-1"
    assert payload["breaker"] == "osrm"


def test_request_id_filter_reads_the_active_request() -> None:
    token = request_id_var.set("abc-123")
    try:
        record = logging.LogRecord("app.x", logging.INFO, __file__, 1, "msg", (), None)
        RequestIdFilter().filter(record)
    finally:
        request_id_var.reset(token)
    assert record.request_id == "abc-123"


def test_exception_fields_keep_type_and_stack_but_not_message() -> None:
    secret = _marker()
    try:
        raise ValueError(secret)
    except ValueError as exc:
        fields = exception_fields(exc)

    assert fields["error_type"] == "ValueError"
    assert "stack" in fields
    assert secret not in json.dumps(fields)


# --- request context middleware --------------------------------------------------


def test_every_response_carries_a_request_id(test_client: TestClient) -> None:
    response = test_client.get("/health")

    assert len(response.headers["X-Request-ID"]) == 32


def test_valid_incoming_request_id_is_echoed(test_client: TestClient) -> None:
    response = test_client.get("/health", headers={"X-Request-ID": "trace-42"})

    assert response.headers["X-Request-ID"] == "trace-42"


@pytest.mark.parametrize("bad_id", ["x" * 65, "has spaces", "new\nline"])
def test_unsafe_incoming_request_id_is_replaced(test_client: TestClient, bad_id: str) -> None:
    response = test_client.get("/health", headers={"X-Request-ID": bad_id})

    assert response.headers["X-Request-ID"] != bad_id
    assert len(response.headers["X-Request-ID"]) == 32


def test_access_log_has_path_and_status_but_no_query_string(
    test_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    secret = _marker()

    with caplog.at_level(logging.INFO):
        test_client.get("/health", params={"q": secret})

    access = [r for r in caplog.records if getattr(r, "event", None) == "http.request"]
    assert access, "expected an access log line"
    assert access[-1].route == "/health"
    assert access[-1].status == 200
    assert access[-1].levelno == logging.INFO
    assert secret not in caplog.text


def test_unmatched_path_is_logged_as_a_fixed_value(
    test_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    secret = _marker()

    with caplog.at_level(logging.INFO):
        test_client.get(f"/no-such-route/{secret}")

    access = [r for r in caplog.records if getattr(r, "event", None) == "http.request"]
    assert access[-1].route == "<unmatched>"
    assert secret not in caplog.text


def test_not_found_is_logged_as_info_not_error(
    test_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO):
        response = test_client.get("/no-such-route")

    assert response.status_code == 404
    assert not [r for r in caplog.records if r.levelno >= logging.ERROR]


# --- unhandled exceptions --------------------------------------------------------


def _app_with_boom_route(test_client: TestClient) -> FastAPI:
    app = test_client.app

    async def boom(q: str) -> None:
        # The message comes from the request, so the marker is never in source code.
        raise RuntimeError(q)

    app.add_api_route("/__boom", boom, methods=["GET"])
    return app


def test_unhandled_exception_returns_500_with_request_id(
    test_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    _app_with_boom_route(test_client)
    secret = _marker()

    with caplog.at_level(logging.ERROR):
        response = test_client.get("/__boom", params={"q": secret})

    assert response.status_code == 500
    body = response.json()
    assert body == {
        "detail": "Internal server error",
        "requestId": response.headers["X-Request-ID"],
    }
    assert secret not in response.text

    errors = [r for r in caplog.records if getattr(r, "event", None) == "unhandled_exception"]
    assert len(errors) == 1
    assert errors[0].error_type == "RuntimeError"
    assert errors[0].route == "/__boom"
    assert errors[0].request_id == body["requestId"]
    assert secret not in caplog.text


def test_geocoding_db_failure_does_not_log_the_typed_address(
    caplog: pytest.LogCaptureFixture,
) -> None:
    typed = _marker()
    # SQLAlchemy puts bound parameters in str(exc); the address must not reach the log.
    driver_error = MagicMock(sqlstate="42P01")
    failure = DBAPIError("SELECT ...", {"q": typed}, driver_error)
    repo = MagicMock(spec=AddressRepository)
    repo.search = AsyncMock(side_effect=failure)
    service = GeocodingService(repo, CacheRepository(client=None))

    with caplog.at_level(logging.ERROR), pytest.raises(DBAPIError):
        asyncio.run(service.search(typed))

    records = [r for r in caplog.records if getattr(r, "event", None) == "address_db.query_failed"]
    assert records and records[0].error_type == "DBAPIError"
    assert typed not in caplog.text


def test_error_after_headers_is_logged_and_response_closed(
    caplog: pytest.LogCaptureFixture,
) -> None:
    from fastapi.responses import StreamingResponse

    from app.middleware.request_context import RequestContextMiddleware

    secret = _marker()
    application = FastAPI()
    application.add_middleware(RequestContextMiddleware)

    async def chunks():  # type: ignore[no-untyped-def]
        yield b"partial"
        # The message is built at runtime so the marker never appears in source.
        raise RuntimeError(secret)

    @application.get("/stream")
    def stream() -> StreamingResponse:
        return StreamingResponse(chunks())

    with caplog.at_level(logging.ERROR):
        # No exception reaches the caller: the middleware closes the response itself.
        response = TestClient(application).get("/stream")

    assert response.status_code == 200
    assert response.content == b"partial"
    errors = [r for r in caplog.records if getattr(r, "event", None) == "unhandled_exception"]
    assert len(errors) == 1
    assert errors[0].route == "/stream"
    assert secret not in caplog.text
