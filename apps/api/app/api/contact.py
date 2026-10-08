from fastapi import APIRouter, HTTPException

from app.config.settings import get_settings
from app.models.contact import ContactRequest
from app.services.contact_mailer import ContactMailerUnavailable, send_contact_email

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", status_code=202)
async def submit_contact(body: ContactRequest) -> dict[str, str]:
    try:
        await send_contact_email(
            get_settings(),
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            message=body.message,
        )
    except ContactMailerUnavailable:
        raise HTTPException(
            status_code=503, detail="Contact form is temporarily unavailable"
        ) from None
    return {"status": "sent"}
