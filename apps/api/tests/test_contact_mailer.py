"""Tests for the Resend-backed contact mailer (app/services/contact_mailer.py)."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.config.settings import Settings
from app.services.contact_mailer import ContactMailerUnavailable, send_contact_email

FIELDS = {"first_name": "Aroha", "last_name": "Ngata", "email": "a@example.com", "message": "Hi"}
POST = "app.services.contact_mailer.httpx.AsyncClient.post"


def _settings(**overrides) -> Settings:
    base = {
        "contact_recipient_email": "owner@example.com",
        "resend_api_key": "re_test",
        "contact_from_email": "noreply@example.com",
    }
    return Settings(_env_file=None, **{**base, **overrides})


def _response(status: int) -> httpx.Response:
    return httpx.Response(
        status, json={}, request=httpx.Request("POST", _settings().resend_emails_url)
    )


async def test_posts_to_resend_with_recipient_and_reply_to() -> None:
    with patch(POST, new=AsyncMock(return_value=_response(200))) as post:
        await send_contact_email(_settings(), **FIELDS)

    assert post.await_args.args[0] == _settings().resend_emails_url
    assert post.await_args.kwargs["headers"] == {"Authorization": "Bearer re_test"}
    body = post.await_args.kwargs["json"]
    assert body["to"] == ["owner@example.com"]
    assert body["reply_to"] == "a@example.com"
    assert "Hi" in body["text"]


async def test_unconfigured_raises_without_calling_resend() -> None:
    with patch(POST, new=AsyncMock()) as post:
        with pytest.raises(ContactMailerUnavailable):
            await send_contact_email(_settings(resend_api_key=None), **FIELDS)
    post.assert_not_awaited()


async def test_resend_error_status_is_wrapped() -> None:
    with patch(POST, new=AsyncMock(return_value=_response(422))):
        with pytest.raises(ContactMailerUnavailable):
            await send_contact_email(_settings(), **FIELDS)


async def test_network_error_is_wrapped() -> None:
    with patch(POST, new=AsyncMock(side_effect=httpx.ConnectError("down"))):
        with pytest.raises(ContactMailerUnavailable):
            await send_contact_email(_settings(), **FIELDS)
