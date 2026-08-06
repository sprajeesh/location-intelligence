from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    address: str | None = None
    lat: float | None = None
    lon: float | None = None
    radius_km: float = Field(default=10.0, alias="radiusKm", ge=0.1, le=100.0)
    # None = use the server's DB-configured default facility set; [] = explicit empty selection
    categories: list[str] | None = None
    distance_mode: Literal["driving", "walking"] = Field(default="driving", alias="distanceMode")

    model_config = {"populate_by_name": True}
