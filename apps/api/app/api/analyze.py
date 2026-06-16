import logging

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import AnalyzeResponse, FeatureResult, LocationResult, ScoreResult

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/location/analyze", response_model=AnalyzeResponse)
async def analyze_location(
    body: AnalyzeRequest,
    request: Request,
) -> AnalyzeResponse:
    geocoding_svc = request.app.state.geocoding_svc
    facilities_svc = request.app.state.facilities_svc
    distance_svc = request.app.state.distance_svc
    scoring_svc = request.app.state.scoring_svc

    warnings: list[str] = []

    # --- Step 1: Resolve coordinates ---
    lat = body.lat
    lon = body.lon
    display_name = body.address or ""

    if lat is None or lon is None:
        if not body.address:
            raise HTTPException(
                status_code=422,
                detail="Provide either lat/lon or a non-empty address",
            )
        try:
            result = await geocoding_svc.geocode_first(body.address)
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="Address search service unavailable")

        if result is None:
            raise HTTPException(status_code=404, detail="Address not found")

        lat = result["lat"]
        lon = result["lon"]
        display_name = result["displayName"]
    elif body.address:
        display_name = body.address

    # --- Step 2: Fetch facilities for requested categories ---
    facilities, facility_warnings = await facilities_svc.fetch_all(
        body.categories, lat, lon, body.radius_km
    )
    warnings.extend(facility_warnings)

    if not facilities:
        warnings.append(f"No facilities found within {body.radius_km}km")

    # --- Step 3: Compute distances ---
    if facilities:
        distance_warnings = await distance_svc.attach_distances(
            facilities, lat, lon, mode=body.distance_mode
        )
        warnings.extend(distance_warnings)

    # --- Step 4: Compute score ---
    domain_score = scoring_svc.score(facilities, body.categories, body.radius_km)

    # --- Assemble response ---
    feature_results = [
        FeatureResult(
            id=f.id,
            name=f.name,
            category=f.category,
            lat=f.lat,
            lon=f.lon,
            distanceKm=round(f.distance_km, 3),
        )
        for f in facilities
    ]

    score_result = ScoreResult(
        education=domain_score.education,
        healthcare=domain_score.healthcare,
        transport=domain_score.transport,
        shopping=domain_score.shopping,
        overall=domain_score.overall,
        coverage=domain_score.coverage,
    )

    return AnalyzeResponse(
        location=LocationResult(lat=lat, lon=lon, displayName=display_name),
        features=feature_results,
        score=score_result,
        warnings=warnings,
    )
