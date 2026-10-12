"""Error reports posted by the browser (see apps/web/src/lib/errorReporting.ts).

Every field is bounded and comes from the page, so nothing user-typed is sent
beyond what the browser already holds: the page pathname and the API path
(never a query string, which carries the typed address).
"""

from typing import Literal

from pydantic import BaseModel, Field


class ClientErrorReport(BaseModel):
    kind: Literal["error", "unhandledrejection", "boundary", "api"]
    error_message: str = Field(max_length=500, alias="errorMessage")
    stack: str | None = Field(default=None, max_length=4000)
    route: str = Field(max_length=200)
    endpoint: str | None = Field(default=None, max_length=200)
    status: int | None = Field(default=None, ge=0, le=599)
    correlation_id: str | None = Field(
        default=None, alias="correlationId", pattern=r"^[A-Za-z0-9-]{1,64}$"
    )
    digest: str | None = Field(default=None, max_length=100)

    model_config = {"populate_by_name": True}
