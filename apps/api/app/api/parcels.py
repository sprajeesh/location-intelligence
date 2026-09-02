import logging

from fastapi import APIRouter, HTTPException, Query, Request

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/parcels/at-point")
async def get_parcel_at_point(
    request: Request,
    lat: float = Query(..., description="Point latitude"),
    lon: float = Query(..., description="Point longitude"),
) -> dict:
    """GeoJSON Feature for the cadastral parcel nearest (lat, lon), for
    highlighting the parcel an address sits on. Returns 404 when no parcel is
    within the lookup radius (e.g. the point is over water or a road reserve)."""
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")

    linz_client = request.app.state.linz_client

    try:
        feature = await linz_client.find_nearest_parcel(lat, lon)
    except Exception as exc:
        logger.error("LINZ parcel lookup failed: %s", exc)
        raise HTTPException(status_code=502, detail="Parcel lookup service unavailable")

    if feature is None:
        raise HTTPException(status_code=404, detail="No parcel found near this location")

    return feature
