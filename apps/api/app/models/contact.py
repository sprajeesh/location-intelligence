import re

from pydantic import BaseModel, Field, field_validator

# Deliberately simple: one "@", no whitespace, a dot in the domain. Real validity
# is only provable by delivery; this just rejects obvious typos and newlines.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ContactRequest(BaseModel):
    first_name: str = Field(alias="firstName", min_length=1, max_length=100)
    last_name: str = Field(default="", alias="lastName", max_length=100)
    email: str = Field(max_length=254)
    message: str = Field(min_length=1, max_length=5000)

    model_config = {"populate_by_name": True}

    @field_validator("first_name", "last_name", "email", "message", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("first_name", "last_name", "email")
    @classmethod
    def _single_line(cls, value: str) -> str:
        if "\r" in value or "\n" in value:
            raise ValueError("must be a single line")
        return value

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        if not _EMAIL_RE.match(value):
            raise ValueError("invalid email address")
        return value
