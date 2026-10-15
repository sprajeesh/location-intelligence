from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from app.api.rate_limit import client_ip, enforce_rate_limit
from app.config.settings import Settings, get_settings
from app.schemas.requests import MapCorrectionRequest
from app.services.map_corrections import MapCorrectionRejected, MapCorrectionService

router = APIRouter(prefix="/map-corrections", tags=["map-corrections"])


@router.post(
    "",
    responses={
        200: {"description": "Already on the map (add) or already gone (remove); nothing stored"},
        202: {"description": "Stored as pending, or merged into a pending report"},
        422: {"description": "Invalid submission"},
        429: {"description": "Rate limit exceeded for this correction type"},
    },
)
async def submit_map_correction(
    body: MapCorrectionRequest,
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    # The limit depends on the body's correctionType, so it is applied here
    # rather than as a router-level dependency. Each type has its own bucket.
    if body.correction_type == "add":
        times = settings.rate_limit_map_correction_add_times
        seconds = settings.rate_limit_map_correction_add_seconds
    else:
        times = settings.rate_limit_map_correction_remove_times
        seconds = settings.rate_limit_map_correction_remove_seconds
    await enforce_rate_limit(request, response, times, seconds, scope=body.correction_type)

    service: MapCorrectionService = request.app.state.map_correction_svc
    try:
        result = await service.submit(body, client_ip=client_ip(request))
    except MapCorrectionRejected as exc:
        raise HTTPException(
            status_code=422,
            detail=[{"loc": ["body", exc.loc], "msg": exc.msg, "type": "value_error"}],
        ) from None
    return JSONResponse(status_code=result.http_status, content=result.body)
