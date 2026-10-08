import logging

import httpx

from app.config.settings import Settings

logger = logging.getLogger(__name__)


class ContactMailerUnavailable(Exception):
    """Contact email delivery isn't configured, or the Resend call failed."""


async def send_contact_email(
    settings: Settings, *, first_name: str, last_name: str, email: str, message: str
) -> None:
    """Emails a contact-form submission to the configured recipient via Resend.
    Reply-To is the visitor's address; From is the app's own verified sender."""
    if not (
        settings.contact_recipient_email and settings.resend_api_key and settings.contact_from_email
    ):
        raise ContactMailerUnavailable("Contact email is not configured")

    full_name = f"{first_name} {last_name}".strip()
    payload = {
        "from": f"Location Intelligence <{settings.contact_from_email}>",
        "to": [settings.contact_recipient_email],
        "reply_to": email,
        "subject": f"Location Intelligence feedback from {full_name}",
        "text": f"From: {full_name} <{email}>\n\n{message}",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                settings.resend_emails_url,
                json=payload,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        # Log the type/status only: the request URL/headers must never reach logs.
        status = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
        logger.error("Contact email send failed (%s, status=%s)", type(exc).__name__, status)
        raise ContactMailerUnavailable("Contact email send failed") from None
