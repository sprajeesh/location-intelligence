"""Tests for POST /contact (app/api/contact.py)."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from fastapi_limiter import FastAPILimiter

from app.services.contact_mailer import ContactMailerUnavailable

VALID = {"firstName": "Aroha", "lastName": "Ngata", "email": "aroha@example.com", "message": "Hi"}
SEND = "app.api.contact.send_contact_email"


@pytest.fixture(autouse=True)
def _no_rate_limit(test_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """The limiter keys persist in a real local Redis between runs; these tests
    cover the handler, not the limit (see test_rate_limit.py)."""
    monkeypatch.setattr(FastAPILimiter, "redis", None)


class TestSubmitContact:
    def test_sends_email_and_returns_202(self, test_client: TestClient) -> None:
        with patch(SEND, new=AsyncMock()) as send:
            response = test_client.post("/contact", json=VALID)

        assert response.status_code == 202
        assert response.json() == {"status": "sent"}
        kwargs = send.await_args.kwargs
        assert kwargs["first_name"] == "Aroha"
        assert kwargs["email"] == "aroha@example.com"

    def test_last_name_is_optional(self, test_client: TestClient) -> None:
        payload = {k: v for k, v in VALID.items() if k != "lastName"}
        with patch(SEND, new=AsyncMock()):
            assert test_client.post("/contact", json=payload).status_code == 202

    def test_rejects_missing_required_fields(self, test_client: TestClient) -> None:
        for field in ("firstName", "email", "message"):
            payload = {**VALID, field: "   "}
            with patch(SEND, new=AsyncMock()) as send:
                response = test_client.post("/contact", json=payload)
            assert response.status_code == 422, field
            send.assert_not_awaited()

    def test_rejects_invalid_email_and_header_injection(self, test_client: TestClient) -> None:
        for email in ("not-an-email", "a@b", "a@b.co\nBcc: x@y.z"):
            response = test_client.post("/contact", json={**VALID, "email": email})
            assert response.status_code == 422, email

    def test_returns_503_when_mailer_unavailable(self, test_client: TestClient) -> None:
        with patch(SEND, new=AsyncMock(side_effect=ContactMailerUnavailable("x"))):
            response = test_client.post("/contact", json=VALID)

        assert response.status_code == 503
