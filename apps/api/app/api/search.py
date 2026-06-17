import logging

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from app.schemas.responses import AddressResult

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/search/address", response_model=list[AddressResult])
async def search_address(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    country: str = Query(default="nz", description="Country code"),
) -> list[AddressResult]:
    geocoding_svc = request.app.state.geocoding_svc

    try:
        results = await geocoding_svc.search(q, country=country)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Address search service unavailable")

    if not results:
        raise HTTPException(status_code=404, detail="Address not found")

    return [
        AddressResult(displayName=r["displayName"], lat=r["lat"], lon=r["lon"]) for r in results
    ]
