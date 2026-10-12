"""POST /client-errors: browser error reports logged with event=client.error."""

import logging
import uuid

import pytest
from fastapi.testclient import TestClient


def _ip() -> str:
    # Rate limits persist in Redis across runs, so use a fresh caller IP each time.
    return f"198.51.100.{uuid.uuid4().int % 250 + 1}"


def _report(**overrides: object) -> dict[str, object]:
    return {
        "kind": "api",
        "errorMessage": "API error: 404 Not Found",
        "route": "/en",
        "endpoint": "/location/analyze",
        "status": 404,
        "requestId": "7f3c9a2e-1b4d-4e8f-9a6b-2c5d7e8f9a0b",
        **overrides,
    }


def _client_error_records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in caplog.records if getattr(r, "event", None) == "client.error"]


def test_accepts_report_and_returns_202(test_client: TestClient) -> None:
    response = test_client.post(
        "/client-errors", json=_report(), headers={"X-Forwarded-Client-Ip": _ip()}
    )

    assert response.status_code == 202


def test_logs_fields_and_links_the_failed_calls_request_id(
    test_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING):
        test_client.post("/client-errors", json=_report(), headers={"X-Forwarded-Client-Ip": _ip()})

    [record] = _client_error_records(caplog)
    assert record.kind == "api"
    assert record.error_message == "API error: 404 Not Found"
    assert record.route == "/en"
    assert record.endpoint == "/location/analyze"
    assert record.status == 404
    assert record.client_request_id == "7f3c9a2e-1b4d-4e8f-9a6b-2c5d7e8f9a0b"


def test_api_failures_log_at_warning_and_page_errors_at_error(
    test_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING):
        test_client.post(
            "/client-errors", json=_report(kind="api"), headers={"X-Forwarded-Client-Ip": _ip()}
        )
        test_client.post(
            "/client-errors",
            json=_report(kind="boundary", endpoint=None, status=None),
            headers={"X-Forwarded-Client-Ip": _ip()},
        )

    levels = {r.kind: r.levelno for r in _client_error_records(caplog)}
    assert levels == {"api": logging.WARNING, "boundary": logging.ERROR}


def test_caller_ip_is_not_logged(test_client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    caller = _ip()

    with caplog.at_level(logging.WARNING):
        test_client.post(
            "/client-errors", json=_report(), headers={"X-Forwarded-Client-Ip": caller}
        )

    assert _client_error_records(caplog)
    assert caller not in caplog.text


def test_request_id_is_optional(test_client: TestClient) -> None:
    body = _report()
    del body["requestId"]

    response = test_client.post(
        "/client-errors", json=body, headers={"X-Forwarded-Client-Ip": _ip()}
    )

    assert response.status_code == 202


def test_rejects_oversized_error_message(test_client: TestClient) -> None:
    response = test_client.post(
        "/client-errors",
        json=_report(errorMessage="x" * 501),
        headers={"X-Forwarded-Client-Ip": _ip()},
    )

    assert response.status_code == 422


def test_rejects_unknown_kind(test_client: TestClient) -> None:
    response = test_client.post(
        "/client-errors", json=_report(kind="telemetry"), headers={"X-Forwarded-Client-Ip": _ip()}
    )

    assert response.status_code == 422


def test_rejects_request_id_that_could_break_a_log_line(test_client: TestClient) -> None:
    response = test_client.post(
        "/client-errors",
        json=_report(requestId="abc\nforged=1"),
        headers={"X-Forwarded-Client-Ip": _ip()},
    )

    assert response.status_code == 422
