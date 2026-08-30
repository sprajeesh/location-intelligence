import logging

from fastapi import APIRouter, HTTPException, Query, Request

from app.schemas.responses import RouteResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/route", response_model=RouteResponse)
async def get_route(
    request: Request,
    fromLat: float = Query(..., description="Origin latitude"),
    fromLon: float = Query(..., description="Origin longitude"),
    toLat: float = Query(..., description="Destination latitude"),
    toLon: float = Query(..., description="Destination longitude"),
    mode: str = Query(
        default="driving", description="Transport mode: driving, walking, or cycling"
    ),
) -> RouteResponse:
    routing_svc = request.app.state.routing_svc

    if not all(isinstance(v, (int, float)) for v in [fromLat, fromLon, toLat, toLon]):
        raise HTTPException(status_code=400, detail="Coordinates must be numeric")

    if not all(-180 <= v <= 180 for v in [fromLon, toLon]):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    if not all(-90 <= v <= 90 for v in [fromLat, toLat]):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")

    try:
        routes = await routing_svc.get_routes(fromLat, fromLon, toLat, toLon, mode)
    except Exception as exc:
        logger.error("Routing service failed: %s", exc)
        raise HTTPException(status_code=502, detail="Routing service unavailable")

    return RouteResponse(routes=routes, fallback=False)
